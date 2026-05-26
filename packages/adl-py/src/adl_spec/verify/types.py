"""Types for the passport verification procedure (§10.3).

Framework-neutral. Adapters for FastAPI middleware, Google ADK callbacks,
LangChain tools, and any other Python agent runtime consume these types
unchanged.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Literal, Optional

EnforcementMode = Literal["enforce", "audit", "permissive"]
RetrievalChannel = Literal["discovery", "direct_url", "header", "local_file"]
PublicKeySource = Literal["inline_only", "did_resolved", "cross_checked", "none"]
StepSeverity = Literal["block", "warn"]


@dataclass(frozen=True)
class VerificationStepResult:
    """Per-step outcome from the verification procedure."""

    section: str
    name: str
    passed: bool
    detail: str
    severity: StepSeverity


@dataclass
class TrustAnchor:
    retrieval_channel: str
    discovery_authority: Optional[str] = None
    did_document_authority: Optional[str] = None


@dataclass
class VerificationOutcome:
    """Aggregate outcome of running the verification procedure (§10.3.1.10)."""

    verified: bool
    steps: list[VerificationStepResult]
    trust_anchor: TrustAnchor
    public_key_source: PublicKeySource
    summary: str


@dataclass
class VerifyConfig:
    """Configuration for the verification procedure.

    Production deployments should set ``require_did_resolution`` and
    ``require_provider_coherence`` to True and supply a
    ``provider_allowlist``.
    """

    mode: EnforcementMode = "enforce"
    require_signature: bool = True
    require_did_resolution: bool = False
    require_provider_coherence: bool = False
    trust_on_first_use: bool = True
    did_local_overrides: dict[str, str] = field(default_factory=dict)
    provider_allowlist: list[str] = field(default_factory=list)


# Reasonable default — same as TS DEFAULT_VERIFY_CONFIG
DEFAULT_VERIFY_CONFIG = VerifyConfig()


@dataclass
class VerifyInput:
    """Inputs to the verification procedure."""

    passport_bytes: bytes
    retrieval_channel: RetrievalChannel
    retrieval_authority: Optional[str] = None
    discovery_authority: Optional[str] = None
    requesting_agent: Optional[dict[str, Any]] = None
