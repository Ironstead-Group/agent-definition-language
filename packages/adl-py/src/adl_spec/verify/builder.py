"""Programmatic ADL passport construction and signing.

``build_passport`` produces a fully-formed ADL document from a structured
input. ``sign_passport`` adds a cryptographic signature per spec §10.3 by
JCS-canonicalizing the document (with any prior signature stripped) and
signing the canonical bytes.
"""

from __future__ import annotations

import copy
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any, Literal, Optional

from .crypto import jcs_canonicalize, sign_canonical


Sensitivity = Literal["public", "internal", "confidential", "restricted"]


@dataclass
class BuildPassportInput:
    name: str
    description: str
    version: str
    id: str
    did: str
    public_key: str
    sensitivity: Sensitivity
    provider: dict[str, str]
    allowed_hosts: list[str]
    issued_at: Optional[str] = None
    expires_at: Optional[str] = None
    tags: Optional[list[str]] = None


def build_passport(input: BuildPassportInput) -> dict[str, Any]:
    """Build a fully-formed ADL passport dict."""
    issued_at = input.issued_at or datetime.now(timezone.utc).isoformat()
    expires_at = input.expires_at
    if expires_at is None:
        # Default to issued_at + 1 year.
        # Datetime parsing handles both Z and offset suffixes.
        issued_dt = datetime.fromisoformat(issued_at.replace("Z", "+00:00"))
        expires_at = (issued_dt + timedelta(days=365)).isoformat()

    return {
        "adl_spec": "0.2.0",
        "name": input.name,
        "description": input.description,
        "version": input.version,
        "id": input.id,
        "data_classification": {"sensitivity": input.sensitivity},
        "lifecycle": {"status": "active", "effective_date": issued_at},
        "provider": input.provider,
        "cryptographic_identity": {
            "did": input.did,
            "public_key": {"algorithm": "Ed25519", "value": input.public_key},
        },
        "permissions": {
            "network": {
                "allowed_hosts": input.allowed_hosts,
                "allowed_protocols": ["https"],
                "deny_private": False,
            },
            "resource_limits": {"max_memory_mb": 1024, "max_duration_sec": 120},
        },
        "security": {
            "authentication": {"type": "api_key", "required": True},
            "encryption": {"in_transit": {"required": True, "min_version": "1.2"}},
            "attestation": {
                "type": "self",
                "issued_at": issued_at,
                "expires_at": expires_at,
            },
        },
        "metadata": {
            "license": "MIT",
            "tags": input.tags if input.tags is not None else [],
        },
    }


def sign_passport(doc: dict[str, Any], private_key_pem: str) -> dict[str, Any]:
    """Sign a passport per spec §10.3.

    1. Remove any existing ``security.attestation.signature``
    2. Serialize via JCS (RFC 8785)
    3. Sign canonical bytes with Ed25519
    4. Insert a ``signature`` object with ``algorithm``, ``value``, ``signed_content="canonical"``
    """
    clone = copy.deepcopy(doc)
    attestation = clone.get("security", {}).get("attestation")
    if attestation is None:
        raise ValueError("Passport must declare security.attestation before signing")
    if "signature" in attestation:
        del attestation["signature"]

    canonical = jcs_canonicalize(clone)
    signature_value = sign_canonical(private_key_pem, canonical.encode("utf-8"))

    attestation["signature"] = {
        "algorithm": "Ed25519",
        "value": signature_value,
        "signed_content": "canonical",
    }
    return clone
