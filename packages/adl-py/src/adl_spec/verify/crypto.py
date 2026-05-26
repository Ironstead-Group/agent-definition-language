"""Cryptographic primitives for ADL passport signing and verification.

Implements the algorithms required by ADL spec §10.2 and the verification
procedure proposed in §10.3:

- Ed25519 keypair generation, sign, verify
- JCS canonicalization (RFC 8785) for ``signed_content: "canonical"``
- Base64url encoding helpers (RFC 4648 §5)

Mirrors the TypeScript reference at ``packages/adl-core/src/verify/crypto.ts``.
Conformance with the test vector pack at
``versions/draft/test-vectors/verify/`` is the contract — both
implementations MUST produce identical canonical bytes for the same input.
"""

from __future__ import annotations

import base64
from dataclasses import dataclass

from cryptography.hazmat.primitives.asymmetric import ed25519
from cryptography.hazmat.primitives.serialization import (
    Encoding,
    NoEncryption,
    PrivateFormat,
    PublicFormat,
    load_pem_private_key,
)


@dataclass(frozen=True)
class KeyPair:
    """Ed25519 keypair in the on-disk format used by ADL passports.

    ``public_key`` is the raw 32-byte Ed25519 public key, Base64-encoded —
    the format required by the spec's ``cryptographic_identity.public_key.value``
    field. ``private_key_pem`` is the PKCS#8 PEM form for portable storage.
    """

    public_key: str
    private_key_pem: str


def generate_key_pair() -> KeyPair:
    """Generate a fresh Ed25519 keypair suitable for ``cryptographic_identity.public_key``."""
    private_key = ed25519.Ed25519PrivateKey.generate()
    raw_public = private_key.public_key().public_bytes(
        encoding=Encoding.Raw, format=PublicFormat.Raw
    )
    pem_private = private_key.private_bytes(
        encoding=Encoding.PEM,
        format=PrivateFormat.PKCS8,
        encryption_algorithm=NoEncryption(),
    ).decode("ascii")
    return KeyPair(
        public_key=base64.b64encode(raw_public).decode("ascii"),
        private_key_pem=pem_private,
    )


def sign_canonical(private_key_pem: str, data: bytes) -> str:
    """Sign canonical bytes with an Ed25519 private key (PKCS#8 PEM).

    Returns a Base64url-encoded signature, matching the spec's
    ``signature.value`` encoding.
    """
    key = load_pem_private_key(private_key_pem.encode("utf-8"), password=None)
    if not isinstance(key, ed25519.Ed25519PrivateKey):
        raise ValueError("private key is not Ed25519")
    sig = key.sign(data)
    return base64url_encode(sig)


def verify_canonical(public_key_base64: str, data: bytes, signature_base64url: str) -> bool:
    """Verify an Ed25519 signature against a raw Base64-encoded public key.

    Accepts a Base64url-encoded signature value.
    """
    raw_key = base64.b64decode(public_key_base64)
    if len(raw_key) != 32:
        return False
    try:
        public_key = ed25519.Ed25519PublicKey.from_public_bytes(raw_key)
        public_key.verify(base64url_decode(signature_base64url), data)
        return True
    except Exception:
        return False


# ---------------------------------------------------------------------------
# JCS canonicalization (RFC 8785)
# ---------------------------------------------------------------------------


def jcs_canonicalize(value: object) -> str:
    """Serialize ``value`` per RFC 8785 (JSON Canonicalization Scheme).

    Implements the subset that ADL passports use: strings, integers,
    booleans, null, arrays, and objects with sorted keys. Per spec §18,
    ADL implementations SHOULD avoid floating-point in signed fields, so
    RFC 8785 §3.2.2.2 number serialization is not implemented.
    """
    if value is None:
        return "null"
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, int):
        return str(value)
    if isinstance(value, float):
        if not _is_finite(value):
            raise ValueError("JCS does not permit non-finite numbers")
        if value.is_integer():
            return str(int(value))
        # Fall back to JSON-compatible repr for non-integer floats; passports
        # avoid these per the §18 guidance.
        import json

        return json.dumps(value)
    if isinstance(value, str):
        return _jcs_string(value)
    if isinstance(value, (list, tuple)):
        return "[" + ",".join(jcs_canonicalize(v) for v in value) + "]"
    if isinstance(value, dict):
        # RFC 8785 §3.2.3: sort by UTF-16 code unit order.
        # Python strings are sequences of code points; for the BMP characters
        # ADL passports use, code unit order coincides with code point order,
        # so plain string sort is correct for the spec subset.
        keys = sorted(value.keys())
        members = [f"{_jcs_string(k)}:{jcs_canonicalize(value[k])}" for k in keys]
        return "{" + ",".join(members) + "}"
    raise TypeError(f"JCS cannot canonicalize value of type {type(value).__name__}")


def _is_finite(x: float) -> bool:
    import math

    return math.isfinite(x)


def _jcs_string(s: str) -> str:
    """RFC 8785 §3.2.2.1 string serialization.

    For the character set ADL passports use (printable ASCII plus common
    Unicode), Python's ``json.dumps`` with ``ensure_ascii=False`` produces
    the canonical form. We use ``ensure_ascii=False`` to avoid emitting
    \\uXXXX escapes for non-ASCII printable characters (per RFC 8785
    §3.2.2.1, only specific control characters and the quote/backslash
    are escaped).
    """
    import json

    return json.dumps(s, ensure_ascii=False)


# ---------------------------------------------------------------------------
# Base64url helpers (RFC 4648 §5)
# ---------------------------------------------------------------------------


def base64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def base64url_decode(s: str) -> bytes:
    pad = "=" * (-len(s) % 4)
    return base64.urlsafe_b64decode(s + pad)
