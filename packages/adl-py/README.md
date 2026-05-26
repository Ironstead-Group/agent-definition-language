# adl-spec (Python)

Python reference implementation of the Agent Definition Language (ADL),
mirroring the TypeScript reference at
[`packages/adl-core`](../adl-core).

This is the second native port of the ADL passport verification core.
The contract for both ports is the language-neutral test vector pack at
[`versions/draft/test-vectors/verify/`](../../versions/draft/test-vectors/verify/) —
both implementations MUST produce identical outcomes for every vector.

## Status

- **Verification core (§10.3)** — full parity with TypeScript. 23/23
  conformance vectors pass.
- **Other modules** (`parse_adl`, `validate_document`) — minimal
  implementations sufficient to support the verification core. The
  CLI, generator, and converters are TypeScript-only for now.

## Install

```bash
cd packages/adl-py
python3 -m venv .venv
.venv/bin/pip install -e ".[dev]"
```

Requires Python ≥ 3.10.

## Use

```python
from adl_spec import (
    verify_passport,
    VerifyConfig,
    VerifyInput,
    DEFAULT_VERIFY_CONFIG,
)

config = VerifyConfig(
    require_signature=True,
    require_did_resolution=True,
    require_provider_coherence=True,
    provider_allowlist=["acme.example"],
)

# passport_bytes is the raw YAML or JSON of the requesting agent's passport
outcome = verify_passport(
    VerifyInput(
        passport_bytes=passport_bytes,
        retrieval_channel="header",
        retrieval_authority="api.acme.example:443",
    ),
    config,
)

if outcome.verified:
    # Allow the request
    ...
else:
    # outcome.summary, outcome.steps describe which §10.3 step blocked
    raise PermissionError(outcome.summary)
```

## Run the conformance test suite

```bash
.venv/bin/pytest tests/test_conformance_vectors.py -v
```

You should see all 23 vectors pass. If a vector fails, the structured
output identifies which §10.3 step disagreed with the spec, and the
corresponding TypeScript test in
[`packages/adl-core/tests/conformance-vectors.test.ts`](../adl-core/tests/conformance-vectors.test.ts)
should produce the same outcome.

## Public API

```python
# Verification procedure
from adl_spec import (
    verify_passport,
    VerifyConfig,
    VerifyInput,
    VerificationOutcome,
    VerificationStepResult,
    EnforcementMode,
    DEFAULT_VERIFY_CONFIG,
)

# Cryptographic primitives
from adl_spec import (
    generate_key_pair,
    sign_canonical,
    verify_canonical,
    jcs_canonicalize,
    base64url_encode,
    base64url_decode,
    KeyPair,
)

# did:web resolution
from adl_spec import (
    resolve_did_web,
    did_web_to_url,
    build_did_document,
    DIDDocument,
    VerificationMethod,
    DIDResolutionResult,
    ResolvedKey,
)

# Programmatic passport construction
from adl_spec import (
    build_passport,
    sign_passport,
    BuildPassportInput,
)

# Parse / validate
from adl_spec import parse_adl, validate_document
```

## Dependencies

- [`cryptography`](https://cryptography.io) — Ed25519 keypair generation,
  signing, and verification.
- [`jsonschema`](https://python-jsonschema.readthedocs.io) — JSON Schema
  Draft 2020-12 validation against the ADL schema.
- [`PyYAML`](https://pyyaml.org) — YAML parsing for `.adl.yaml` passports.

No HTTP library is required for the verification core itself; the DID
resolver accepts an injected `fetch_impl` so test harnesses (and the
conformance runner) can intercept network calls without monkey-patching
the standard library.

## Spec section anchors

| §10.3 step | Implementation file |
|------------|---------------------|
| 10.3.1.1 Retrieval integrity | [`verify.py`](src/adl_spec/verify/verify.py) (`_check_retrieval_integrity`) |
| 10.3.1.2 Schema validation | [`verify.py`](src/adl_spec/verify/verify.py) + [`validator.py`](src/adl_spec/verify/validator.py) |
| 10.3.1.3 Identity resolution | [`did_resolver.py`](src/adl_spec/verify/did_resolver.py) (`resolve_did_web`) |
| 10.3.1.4 Public key cross-check | [`verify.py`](src/adl_spec/verify/verify.py) |
| 10.3.1.5 Signature verification | [`crypto.py`](src/adl_spec/verify/crypto.py) (`verify_canonical`) + [`verify.py`](src/adl_spec/verify/verify.py) |
| 10.3.1.6 Temporal validity | [`verify.py`](src/adl_spec/verify/verify.py) (`_check_temporal_validity`) |
| 10.3.1.7 Lifecycle gating | [`verify.py`](src/adl_spec/verify/verify.py) (`_check_lifecycle`) |
| 10.3.1.8 Provider coherence | [`verify.py`](src/adl_spec/verify/verify.py) (`_check_provider_coherence`) |
| 10.3.1.9 Classification compatibility | [`verify.py`](src/adl_spec/verify/verify.py) (`_check_classification_compat`) |

## Related

- [Verification procedure proposal](../../proposals/2026-05-03-passport-verification-procedure.md)
- [Test vector pack](../../versions/draft/test-vectors/verify/)
- [TypeScript reference (`@adl-spec/core`)](../adl-core/)
