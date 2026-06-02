"""adl_spec — Python reference implementation of the Agent Definition Language.

Public API mirrors @adl-spec/core (TypeScript) but uses idiomatic Python
naming (snake_case) and types (dataclasses, TypedDicts).
"""

from adl_spec.verify.builder import (
    BuildPassportInput,
    build_passport,
    sign_passport,
)
from adl_spec.verify.crypto import (
    KeyPair,
    base64url_decode,
    base64url_encode,
    generate_key_pair,
    jcs_canonicalize,
    sign_canonical,
    verify_canonical,
)
from adl_spec.verify.did_resolver import (
    DIDDocument,
    DIDResolutionResult,
    ResolvedKey,
    VerificationMethod,
    build_did_document,
    did_web_to_url,
    resolve_did_web,
)
from adl_spec.verify.parser import parse_adl
from adl_spec.verify.types import (
    DEFAULT_VERIFY_CONFIG,
    EnforcementMode,
    VerificationOutcome,
    VerificationStepResult,
    VerifyConfig,
    VerifyInput,
)
from adl_spec.verify.validator import validate_document
from adl_spec.verify.verify import verify_passport

__all__ = [
    # Verify procedure
    "verify_passport",
    "VerifyConfig",
    "VerifyInput",
    "VerificationOutcome",
    "VerificationStepResult",
    "EnforcementMode",
    "DEFAULT_VERIFY_CONFIG",
    # Crypto
    "generate_key_pair",
    "sign_canonical",
    "verify_canonical",
    "jcs_canonicalize",
    "base64url_encode",
    "base64url_decode",
    "KeyPair",
    # DID resolution
    "resolve_did_web",
    "did_web_to_url",
    "build_did_document",
    "DIDDocument",
    "VerificationMethod",
    "DIDResolutionResult",
    "ResolvedKey",
    # Construction
    "build_passport",
    "sign_passport",
    "BuildPassportInput",
    # Parse / validate
    "parse_adl",
    "validate_document",
]

__version__ = "0.2.0"
