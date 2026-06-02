"""Reference implementation of the passport verification procedure (§10.3).

Mirrors the TypeScript reference at ``packages/adl-core/src/verify/verify.ts``.
The contract for both implementations is the test vector pack at
``versions/draft/test-vectors/verify/`` — both MUST produce identical
outcomes for every vector.
"""

from __future__ import annotations

import copy
from datetime import datetime, timezone
from typing import Any, Optional
from urllib.parse import urlparse

from .crypto import jcs_canonicalize, verify_canonical
from .did_resolver import FetchImpl, resolve_did_web
from .parser import parse_adl
from .types import (
    PublicKeySource,
    TrustAnchor,
    VerificationOutcome,
    VerificationStepResult,
    VerifyConfig,
    VerifyInput,
)
from .validator import validate_document


def verify_passport(
    input: VerifyInput,
    config: VerifyConfig,
    *,
    fetch_impl: Optional[FetchImpl] = None,
) -> VerificationOutcome:
    """Run the §10.3 verification procedure against a passport.

    ``fetch_impl`` lets test harnesses supply a non-network fetch for
    ``did:web`` resolution. When omitted, real HTTP is used.
    """
    steps: list[VerificationStepResult] = []
    public_key_source: PublicKeySource = "none"
    did_document_authority: Optional[str] = None

    # §1.1.1 Retrieval Integrity
    steps.append(_check_retrieval_integrity(input))
    if _is_blocked(steps):
        return _finalize(steps, input, public_key_source, did_document_authority)

    # §1.1.2 Schema Validation
    text = input.passport_bytes.decode("utf-8")
    fmt = "json" if text.lstrip().startswith("{") else "yaml"
    document, parse_errors = parse_adl(text, fmt)
    if document is None:
        steps.append(
            VerificationStepResult(
                section="1.1.2",
                name="Schema validation",
                passed=False,
                severity="block",
                detail=f"Parse failed: {'; '.join(parse_errors)}",
            )
        )
        return _finalize(steps, input, public_key_source, did_document_authority)

    val_result = validate_document(document)
    steps.append(
        VerificationStepResult(
            section="1.1.2",
            name="Schema validation",
            passed=val_result.valid,
            severity="block",
            detail=(
                "Document conforms to ADL schema"
                if val_result.valid
                else f"{len(val_result.errors)} schema error(s): "
                + ", ".join(f"[{e.code}]" for e in val_result.errors)
            ),
        )
    )
    if not val_result.valid:
        return _finalize(steps, input, public_key_source, did_document_authority)

    # §1.1.3 Identity Resolution
    id_result_step, did_key, did_authority = _resolve_identity(
        document, config, fetch_impl
    )
    steps.append(id_result_step)
    if did_key is not None:
        did_document_authority = did_authority
    if _is_blocked(steps):
        return _finalize(steps, input, public_key_source, did_document_authority)

    # §1.1.4 Public Key Cross-Check
    crypto_id = document.get("cryptographic_identity") or {}
    public_key_obj = crypto_id.get("public_key") or {}
    inline_key = public_key_obj.get("value")
    inline_alg = public_key_obj.get("algorithm")

    if did_key and inline_key:
        alg_match = inline_alg == did_key["algorithm"]
        val_match = inline_key == did_key["value"]
        passed = alg_match and val_match
        if passed:
            detail = "Inline public_key matches DID Document assertionMethod key"
        elif not alg_match:
            detail = f"Algorithm mismatch: inline={inline_alg}, did={did_key['algorithm']}"
        else:
            detail = "Public key bytes differ between inline and DID Document"
        steps.append(
            VerificationStepResult(
                section="1.1.4",
                name="Public key cross-check",
                passed=passed,
                severity="block",
                detail=detail,
            )
        )
        public_key_source = "cross_checked" if passed else "none"
        if not passed:
            return _finalize(steps, input, public_key_source, did_document_authority)
    elif did_key:
        public_key_source = "did_resolved"
        steps.append(
            VerificationStepResult(
                section="1.1.4",
                name="Public key cross-check",
                passed=True,
                severity="warn",
                detail="No inline public_key — using DID-resolved key only",
            )
        )
    elif inline_key:
        public_key_source = "inline_only"
        if not config.trust_on_first_use and config.require_did_resolution:
            steps.append(
                VerificationStepResult(
                    section="1.1.4",
                    name="Public key cross-check",
                    passed=False,
                    severity="block",
                    detail="DID resolution required but failed; no resolved key to cross-check inline public_key",
                )
            )
            return _finalize(steps, input, public_key_source, did_document_authority)
        steps.append(
            VerificationStepResult(
                section="1.1.4",
                name="Public key cross-check",
                passed=True,
                severity="warn",
                detail="Inline public_key only — Trust-On-First-Use mode (DID resolution unavailable or skipped)",
            )
        )
    else:
        steps.append(
            VerificationStepResult(
                section="1.1.4",
                name="Public key cross-check",
                passed=False,
                severity="block",
                detail="No public key available from any source",
            )
        )
        return _finalize(steps, input, public_key_source, did_document_authority)

    verification_key = (did_key["value"] if did_key else inline_key)

    # §1.1.5 Signature Verification
    steps.append(_verify_signature_step(document, verification_key, config))
    if _is_blocked(steps):
        return _finalize(steps, input, public_key_source, did_document_authority)

    # §1.1.6 Temporal Validity
    steps.append(_check_temporal_validity(document))
    if _is_blocked(steps):
        return _finalize(steps, input, public_key_source, did_document_authority)

    # §1.1.7 Lifecycle Gating
    steps.append(_check_lifecycle(document))
    if _is_blocked(steps):
        return _finalize(steps, input, public_key_source, did_document_authority)

    # §1.1.8 Provider–Identity Coherence
    steps.append(_check_provider_coherence(document, config))
    if _is_blocked(steps):
        return _finalize(steps, input, public_key_source, did_document_authority)

    # §1.1.9 Permission/Classification Compatibility
    if input.requesting_agent is not None:
        steps.append(_check_classification_compat(document, input.requesting_agent))
        if _is_blocked(steps):
            return _finalize(steps, input, public_key_source, did_document_authority)

    return _finalize(steps, input, public_key_source, did_document_authority)


# ---------------------------------------------------------------------------
# Step implementations
# ---------------------------------------------------------------------------


def _is_blocked(steps: list[VerificationStepResult]) -> bool:
    last = steps[-1]
    return not last.passed and last.severity == "block"


def _check_retrieval_integrity(input: VerifyInput) -> VerificationStepResult:
    if input.retrieval_channel == "local_file":
        return VerificationStepResult(
            section="1.1.1",
            name="Retrieval integrity",
            passed=True,
            severity="warn",
            detail="Loaded from local file — provenance recorded; no transport security",
        )
    auth = input.retrieval_authority
    if auth and (auth.startswith("localhost:") or auth.startswith("127.0.0.1")):
        return VerificationStepResult(
            section="1.1.1",
            name="Retrieval integrity",
            passed=True,
            severity="warn",
            detail=f"Localhost retrieval ({auth}) — TLS bypass for development",
        )
    if not auth:
        return VerificationStepResult(
            section="1.1.1",
            name="Retrieval integrity",
            passed=False,
            severity="block",
            detail="No retrieval authority recorded — cannot establish trust anchor",
        )
    return VerificationStepResult(
        section="1.1.1",
        name="Retrieval integrity",
        passed=True,
        severity="block",
        detail=f"Retrieved from {auth}",
    )


def _resolve_identity(
    document: dict[str, Any],
    config: VerifyConfig,
    fetch_impl: Optional[FetchImpl],
) -> tuple[VerificationStepResult, Optional[dict[str, str]], Optional[str]]:
    crypto_id = document.get("cryptographic_identity") or {}
    did = crypto_id.get("did")
    if not did:
        return (
            VerificationStepResult(
                section="1.1.3",
                name="Identity resolution",
                passed=not config.require_did_resolution,
                severity="block" if config.require_did_resolution else "warn",
                detail="Document declares no did:web identifier",
            ),
            None,
            None,
        )
    if not did.startswith("did:web:"):
        return (
            VerificationStepResult(
                section="1.1.3",
                name="Identity resolution",
                passed=False,
                severity="block",
                detail=f"Unsupported DID method (only did:web is implemented): {did}",
            ),
            None,
            None,
        )

    result = resolve_did_web(
        did,
        local_overrides=config.did_local_overrides,
        fetch_impl=fetch_impl,
    )
    if not result.resolved or result.key is None:
        return (
            VerificationStepResult(
                section="1.1.3",
                name="Identity resolution",
                passed=(not config.require_did_resolution and config.trust_on_first_use),
                severity="block" if config.require_did_resolution else "warn",
                detail=f"did:web resolution failed: {result.error or 'unknown'}",
            ),
            None,
            None,
        )
    return (
        VerificationStepResult(
            section="1.1.3",
            name="Identity resolution",
            passed=True,
            severity="block",
            detail=f"Resolved {did} → {result.key.algorithm} key from {result.key.did_document_url}",
        ),
        {"algorithm": result.key.algorithm, "value": result.key.value},
        result.authority,
    )


def _verify_signature_step(
    document: dict[str, Any], public_key_base64: str, config: VerifyConfig
) -> VerificationStepResult:
    sig = (document.get("security") or {}).get("attestation", {}).get("signature")
    if sig is None:
        return VerificationStepResult(
            section="1.1.5",
            name="Signature verification",
            passed=not config.require_signature,
            severity="block" if config.require_signature else "warn",
            detail="Document has no signature",
        )
    if sig.get("algorithm") != "Ed25519":
        return VerificationStepResult(
            section="1.1.5",
            name="Signature verification",
            passed=False,
            severity="block",
            detail=f"Unsupported signature algorithm in this implementation (only Ed25519): {sig.get('algorithm')}",
        )
    if sig.get("signed_content") != "canonical":
        return VerificationStepResult(
            section="1.1.5",
            name="Signature verification",
            passed=False,
            severity="block",
            detail=f"This implementation only supports signed_content=\"canonical\" (got {sig.get('signed_content')!r})",
        )

    clone = copy.deepcopy(document)
    if "signature" in (clone.get("security", {}).get("attestation") or {}):
        del clone["security"]["attestation"]["signature"]
    canonical = jcs_canonicalize(clone)
    valid = verify_canonical(public_key_base64, canonical.encode("utf-8"), sig["value"])
    return VerificationStepResult(
        section="1.1.5",
        name="Signature verification",
        passed=valid,
        severity="block",
        detail=(
            "Ed25519 signature verifies against JCS-canonical bytes"
            if valid
            else "Ed25519 signature does NOT verify — document tampered or wrong key"
        ),
    )


def _check_temporal_validity(document: dict[str, Any]) -> VerificationStepResult:
    expires_at = (document.get("security") or {}).get("attestation", {}).get("expires_at")
    if expires_at is None:
        return VerificationStepResult(
            section="1.1.6",
            name="Temporal validity",
            passed=True,
            severity="warn",
            detail="No expires_at declared",
        )
    try:
        exp_dt = datetime.fromisoformat(expires_at.replace("Z", "+00:00"))
    except ValueError:
        return VerificationStepResult(
            section="1.1.6",
            name="Temporal validity",
            passed=False,
            severity="block",
            detail=f"Invalid expires_at format: {expires_at}",
        )
    now = datetime.now(timezone.utc)
    if exp_dt < now:
        return VerificationStepResult(
            section="1.1.6",
            name="Temporal validity",
            passed=False,
            severity="block",
            detail=f"Attestation expired {expires_at}",
        )
    days_until = (exp_dt - now).total_seconds() / 86400
    if days_until < 30:
        return VerificationStepResult(
            section="1.1.6",
            name="Temporal validity",
            passed=True,
            severity="warn",
            detail=f"Attestation expires in {int(days_until)} days (warn threshold: 30)",
        )
    return VerificationStepResult(
        section="1.1.6",
        name="Temporal validity",
        passed=True,
        severity="block",
        detail=f"Attestation valid until {expires_at}",
    )


def _check_lifecycle(document: dict[str, Any]) -> VerificationStepResult:
    lifecycle = document.get("lifecycle") or {}
    status = lifecycle.get("status", "active")
    if status == "retired":
        successor = lifecycle.get("successor", "(none declared)")
        return VerificationStepResult(
            section="1.1.7",
            name="Lifecycle gating",
            passed=False,
            severity="block",
            detail=f"Agent is retired; successor: {successor}",
        )
    if status == "deprecated":
        parts = ["Agent is deprecated"]
        if lifecycle.get("sunset_date"):
            parts.append(f"(sunset {lifecycle['sunset_date']})")
        if lifecycle.get("successor"):
            parts.append(f"— successor: {lifecycle['successor']}")
        return VerificationStepResult(
            section="1.1.7",
            name="Lifecycle gating",
            passed=True,
            severity="warn",
            detail=" ".join(parts),
        )
    if status == "draft":
        return VerificationStepResult(
            section="1.1.7",
            name="Lifecycle gating",
            passed=False,
            severity="block",
            detail="Agent is draft — production runtimes MUST refuse",
        )
    return VerificationStepResult(
        section="1.1.7",
        name="Lifecycle gating",
        passed=True,
        severity="block",
        detail="Agent is active",
    )


def _check_provider_coherence(
    document: dict[str, Any], config: VerifyConfig
) -> VerificationStepResult:
    if not config.require_provider_coherence:
        return VerificationStepResult(
            section="1.1.8",
            name="Provider–identity coherence",
            passed=True,
            severity="warn",
            detail="Coherence check disabled by config",
        )
    provider = document.get("provider") or {}
    provider_url = provider.get("url")
    if not provider_url:
        return VerificationStepResult(
            section="1.1.8",
            name="Provider–identity coherence",
            passed=True,
            severity="warn",
            detail="No provider.url declared",
        )
    try:
        provider_host = urlparse(provider_url).hostname
    except ValueError:
        provider_host = None
    if not provider_host:
        return VerificationStepResult(
            section="1.1.8",
            name="Provider–identity coherence",
            passed=False,
            severity="block",
            detail=f"Cannot parse provider.url: {provider_url}",
        )
    if config.provider_allowlist and provider_host not in config.provider_allowlist:
        return VerificationStepResult(
            section="1.1.8",
            name="Provider–identity coherence",
            passed=False,
            severity="block",
            detail=f"Provider {provider_host} not on allowlist: [{', '.join(config.provider_allowlist)}]",
        )
    return VerificationStepResult(
        section="1.1.8",
        name="Provider–identity coherence",
        passed=True,
        severity="block",
        detail=f"Provider {provider_host} accepted",
    )


def _check_classification_compat(
    target: dict[str, Any], requesting: dict[str, Any]
) -> VerificationStepResult:
    order = ["public", "internal", "confidential", "restricted"]
    target_sens = (target.get("data_classification") or {}).get("sensitivity")
    req_sens = (requesting.get("data_classification") or {}).get("sensitivity")
    if target_sens not in order or req_sens not in order:
        return VerificationStepResult(
            section="1.1.9",
            name="Permission/classification compatibility",
            passed=False,
            severity="block",
            detail=f"Invalid sensitivity values: target={target_sens}, requesting={req_sens}",
        )
    if order.index(req_sens) < order.index(target_sens):
        return VerificationStepResult(
            section="1.1.9",
            name="Permission/classification compatibility",
            passed=False,
            severity="block",
            detail=f"Requesting agent ({req_sens}) cannot access {target_sens} data on {target.get('name')}",
        )
    return VerificationStepResult(
        section="1.1.9",
        name="Permission/classification compatibility",
        passed=True,
        severity="block",
        detail=f"Requesting agent ({req_sens}) cleared for {target_sens} target",
    )


# ---------------------------------------------------------------------------
# Outcome assembly (§1.1.10)
# ---------------------------------------------------------------------------


def _finalize(
    steps: list[VerificationStepResult],
    input: VerifyInput,
    public_key_source: PublicKeySource,
    did_document_authority: Optional[str],
) -> VerificationOutcome:
    blocking = next((s for s in steps if not s.passed and s.severity == "block"), None)
    verified = blocking is None
    if verified:
        summary = f"verified ({len(steps)} steps; key source: {public_key_source})"
    else:
        summary = f"not_verified at §{blocking.section} ({blocking.name}): {blocking.detail}"
    return VerificationOutcome(
        verified=verified,
        steps=steps,
        trust_anchor=TrustAnchor(
            retrieval_channel=input.retrieval_channel,
            discovery_authority=input.discovery_authority,
            did_document_authority=did_document_authority,
        ),
        public_key_source=public_key_source,
        summary=summary,
    )
