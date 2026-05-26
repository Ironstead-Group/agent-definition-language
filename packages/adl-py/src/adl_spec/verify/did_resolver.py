"""did:web resolver.

Implements the resolution procedure required by the verification proposal
§10.3.1.3:

- ``did:web:{domain}``             → ``https://{domain}/.well-known/did.json``
- ``did:web:{domain}:{path...}``   → ``https://{domain}/{path...}/did.json``

Extracts the public key designated by the DID Document's
``assertionMethod`` verification relationship (per W3C DID Core).
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from typing import Any, Callable, Literal, Optional, Protocol
from urllib.parse import urlparse


@dataclass
class VerificationMethod:
    id: str
    type: str
    controller: str
    publicKeyMultibase: Optional[str] = None
    publicKeyJwk: Optional[dict[str, Any]] = None
    publicKeyBase64: Optional[str] = None


@dataclass
class DIDDocument:
    id: str
    verificationMethod: list[VerificationMethod] = field(default_factory=list)
    assertionMethod: list[Any] = field(default_factory=list)


@dataclass
class ResolvedKey:
    algorithm: Literal["Ed25519"]
    value: str
    source: Literal["did_document"]
    did_document_url: str


@dataclass
class DIDResolutionResult:
    resolved: bool
    key: Optional[ResolvedKey] = None
    error: Optional[str] = None
    authority: Optional[str] = None


class FetchImpl(Protocol):
    """A fetch-like callable: takes a URL, returns ``(status, body_bytes)``.

    Matches the shape used by the conformance test vector runner and any
    test harness that wants to intercept HTTP without real network.
    """

    def __call__(self, url: str) -> tuple[int, bytes]: ...


def did_web_to_url(did: str, local_overrides: Optional[dict[str, str]] = None) -> str:
    """Convert a ``did:web`` identifier to its resolution URL.

    Examples
    --------
    ``did:web:home.local`` → ``https://home.local/.well-known/did.json``
    ``did:web:home.local:agents:bot`` → ``https://home.local/agents/bot/did.json``
    """
    if not did.startswith("did:web:"):
        raise ValueError(f"Not a did:web identifier: {did}")
    overrides = local_overrides or {}
    segments = [_pct_decode(s) for s in did[len("did:web:") :].split(":")]
    domain, *path_segments = segments
    base_url = overrides.get(domain, f"https://{domain}")
    if not path_segments:
        return f"{base_url}/.well-known/did.json"
    return f"{base_url}/{'/'.join(path_segments)}/did.json"


def _pct_decode(s: str) -> str:
    from urllib.parse import unquote

    return unquote(s)


def resolve_did_web(
    did: str,
    *,
    local_overrides: Optional[dict[str, str]] = None,
    fetch_impl: Optional[FetchImpl] = None,
) -> DIDResolutionResult:
    """Resolve a ``did:web`` identifier to an Ed25519 public key.

    ``fetch_impl`` lets tests inject a non-network fetch. When omitted,
    falls back to ``urllib.request.urlopen``.
    """
    try:
        url = did_web_to_url(did, local_overrides)
    except ValueError as e:
        return DIDResolutionResult(resolved=False, error=str(e))

    fetch = fetch_impl or _default_fetch

    try:
        status, body = fetch(url)
    except Exception as e:
        return DIDResolutionResult(
            resolved=False, error=f"Failed to fetch DID Document at {url}: {e}"
        )

    if status != 200:
        return DIDResolutionResult(
            resolved=False,
            error=f"DID Document fetch returned HTTP {status} for {url}",
        )

    try:
        raw = json.loads(body)
    except json.JSONDecodeError as e:
        return DIDResolutionResult(
            resolved=False, error=f"DID Document is not valid JSON: {e}"
        )

    did_doc = _parse_did_document(raw)
    key = _extract_assertion_method_key(did_doc)
    if key is None:
        return DIDResolutionResult(
            resolved=False,
            error="DID Document has no resolvable assertionMethod public key",
        )

    return DIDResolutionResult(
        resolved=True,
        key=ResolvedKey(
            algorithm="Ed25519",
            value=key,
            source="did_document",
            did_document_url=url,
        ),
        authority=urlparse(url).netloc,
    )


def _default_fetch(url: str) -> tuple[int, bytes]:
    """Default network fetch using urllib."""
    from urllib.request import Request, urlopen

    req = Request(url)
    with urlopen(req, timeout=10) as resp:  # noqa: S310 — caller controls URL
        return resp.status, resp.read()


def _parse_did_document(raw: Any) -> DIDDocument:
    if not isinstance(raw, dict):
        return DIDDocument(id="")
    methods = []
    for m in raw.get("verificationMethod") or []:
        if isinstance(m, dict):
            methods.append(
                VerificationMethod(
                    id=m.get("id", ""),
                    type=m.get("type", ""),
                    controller=m.get("controller", ""),
                    publicKeyMultibase=m.get("publicKeyMultibase"),
                    publicKeyJwk=m.get("publicKeyJwk"),
                    publicKeyBase64=m.get("publicKeyBase64"),
                )
            )
    return DIDDocument(
        id=raw.get("id", ""),
        verificationMethod=methods,
        assertionMethod=raw.get("assertionMethod") or [],
    )


def _extract_assertion_method_key(doc: DIDDocument) -> Optional[str]:
    candidates: list[VerificationMethod] = []
    for entry in doc.assertionMethod:
        if isinstance(entry, str):
            for m in doc.verificationMethod:
                if m.id == entry:
                    candidates.append(m)
                    break
        elif isinstance(entry, dict):
            candidates.append(
                VerificationMethod(
                    id=entry.get("id", ""),
                    type=entry.get("type", ""),
                    controller=entry.get("controller", ""),
                    publicKeyBase64=entry.get("publicKeyBase64"),
                    publicKeyJwk=entry.get("publicKeyJwk"),
                )
            )
    # Fallback: assertionMethod absent but verificationMethod has entries
    if not candidates and doc.verificationMethod:
        candidates.append(doc.verificationMethod[0])

    for m in candidates:
        if m.publicKeyBase64:
            return m.publicKeyBase64
        if m.publicKeyJwk:
            jwk = m.publicKeyJwk
            if jwk.get("kty") == "OKP" and jwk.get("crv") == "Ed25519" and jwk.get("x"):
                # JWK x is base64url; convert to standard base64.
                from .crypto import base64url_decode
                import base64

                return base64.b64encode(base64url_decode(jwk["x"])).decode("ascii")
    return None


def build_did_document(did: str, public_key_base64: str) -> dict[str, Any]:
    """Build a minimal DID Document for an Ed25519 keypair.

    Returns a JSON-serializable dict suitable for serving at the well-known
    location.
    """
    key_id = f"{did}#key-1"
    return {
        "id": did,
        "verificationMethod": [
            {
                "id": key_id,
                "type": "Ed25519VerificationKey2020",
                "controller": did,
                "publicKeyBase64": public_key_base64,
            }
        ],
        "assertionMethod": [key_id],
    }
