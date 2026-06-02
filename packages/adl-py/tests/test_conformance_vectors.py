"""Conformance test for the verify test vector pack — Python port.

Loads every JSON file under
  versions/draft/test-vectors/verify/vectors/
and asserts that the Python reference implementation produces the
documented expected outcome for each.

The same vectors are run by the TypeScript reference at
  packages/adl-core/tests/conformance-vectors.test.ts.
A passing pair is the cross-language conformance proof.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import pytest
import yaml

from adl_spec import VerifyConfig, VerifyInput, verify_passport

REPO_ROOT = Path(__file__).resolve().parents[3]
VECTORS_DIR = REPO_ROOT / "versions" / "draft" / "test-vectors" / "verify" / "vectors"


def load_vectors() -> list[dict[str, Any]]:
    if not VECTORS_DIR.is_dir():
        raise FileNotFoundError(
            f"Vector directory not found: {VECTORS_DIR}. "
            "Run: bun run packages/adl-core/scripts/generate-test-vectors.ts"
        )
    files = sorted(VECTORS_DIR.glob("*.json"))
    return [json.loads(p.read_text()) for p in files]


def make_vector_fetch(responses: dict[str, dict[str, Any]] | None):
    """Build a fetch_impl that answers from the vector's pre-canned table.

    URLs not in the table return 404 to simulate "no such resource on the
    network" — vectors that exercise DID resolution must include every
    URL the resolver might fetch.
    """
    table = responses or {}

    def fetch(url: str) -> tuple[int, bytes]:
        r = table.get(url)
        if r is None:
            return 404, json.dumps({"error": "vector_not_mapped", "url": url}).encode()
        return r["status"], json.dumps(r["body"]).encode()

    return fetch


def vector_to_input_bytes(vector: dict[str, Any]) -> bytes:
    fmt = vector["input"].get("passport_format", "json")
    passport = vector["input"]["passport"]
    if fmt == "yaml":
        return yaml.safe_dump(passport, sort_keys=False).encode("utf-8")
    return json.dumps(passport).encode("utf-8")


def vector_to_config(vector: dict[str, Any]) -> VerifyConfig:
    c = vector["config"]
    return VerifyConfig(
        mode=c.get("mode", "enforce"),
        require_signature=c.get("requireSignature", True),
        require_did_resolution=c.get("requireDidResolution", False),
        require_provider_coherence=c.get("requireProviderCoherence", False),
        trust_on_first_use=c.get("trustOnFirstUse", True),
        did_local_overrides=c.get("didLocalOverrides", {}) or {},
        provider_allowlist=c.get("providerAllowlist", []) or [],
    )


VECTORS = load_vectors()


@pytest.mark.parametrize("vector", VECTORS, ids=[v["id"] for v in VECTORS])
def test_conformance_vector(vector: dict[str, Any]) -> None:
    passport_bytes = vector_to_input_bytes(vector)
    config = vector_to_config(vector)
    fetch_impl = make_vector_fetch(vector["input"].get("did_resolution_responses"))

    retrieval = vector["input"]["retrieval"]
    requesting = vector["input"].get("requesting_agent")

    outcome = verify_passport(
        VerifyInput(
            passport_bytes=passport_bytes,
            retrieval_channel=retrieval["channel"],
            retrieval_authority=retrieval.get("authority"),
            discovery_authority=retrieval.get("discovery_authority"),
            requesting_agent=requesting,
        ),
        config,
        fetch_impl=fetch_impl,
    )

    expected = vector["expected"]

    # Top-level
    assert outcome.verified == expected["verified"], outcome.summary
    assert outcome.public_key_source == expected["public_key_source"], outcome.summary

    # Blocked-at-section
    if not expected["verified"]:
        blocking = next(
            (s for s in outcome.steps if not s.passed and s.severity == "block"),
            None,
        )
        assert blocking is not None, f"Expected a blocking step, got steps: {outcome.steps}"
        assert blocking.section == expected["blocked_at_section"], (
            f"Expected block at §{expected['blocked_at_section']}, "
            f"got §{blocking.section}: {blocking.detail}"
        )

    # Per-step outcomes
    for exp in expected["step_outcomes"]:
        matching = next((s for s in outcome.steps if s.section == exp["section"]), None)
        assert matching is not None, (
            f"Vector expects a §{exp['section']} step but the implementation "
            f"did not emit one. Outcome steps: "
            f"{[s.section for s in outcome.steps]}"
        )
        assert {
            "section": matching.section,
            "passed": matching.passed,
            "severity": matching.severity,
        } == exp, (
            f"Step §{exp['section']} mismatch:\n"
            f"  expected: {exp}\n"
            f"  actual:   passed={matching.passed} severity={matching.severity}\n"
            f"  detail:   {matching.detail}"
        )
