# ADL Standardization Roadmap

This document outlines phases and milestones for taking the Agent Definition Language (ADL) through community development and into formal standardization with multiple bodies.

## Phase 1: Community Draft (Current)

- **Goal:** Stabilize a community-driven draft specification and gather implementer feedback.
- **Deliverables:**
  - Published draft spec in `versions/` (e.g., 0.1.0-draft).
  - Public repository with CONTRIBUTING, GOVERNANCE, and CODE_OF_CONDUCT.
  - At least one reference implementation or validator (see [IMPLEMENTATIONS.md](../IMPLEMENTATIONS.md)).
  - Example agent definitions in `examples/`.
- **Success criteria:** Multiple independent reviewers and at least one adopter or tool implementing the draft.

## Phase 2: Liaison and Pre-Submission

- **Goal:** Align with target standards bodies and prepare submission-ready materials.
- **Deliverables:**
  - Per-organization briefs in `standardization/bodies/` (requirements, timelines, contacts).
  - Single “source of truth” spec text suitable for conversion to each body’s format (e.g., RFC XML, ISO WD).
  - Clarification of IPR and copyright (e.g., Apache 2.0, SFR, RF) for each target.
- **Success criteria:** Clear submission path for at least one primary body (e.g., Linux Foundation AAIF — Agentic AI Foundation, or IETF).

## Phase 3: Formal Submissions

- **Goal:** Submit ADL to chosen standards organizations.
- **Possible tracks (non-exclusive):**
  - **Linux Foundation (e.g., AAIF — Agentic AI Foundation / OAI-style):** New project or working group under an existing initiative.
  - **IETF:** Internet-Draft → RFC (e.g., Informational or Standards Track).
  - **ISO/IEC:** New Work Item (e.g., under JTC 1/SC 42) leading to an International Standard.
- **Deliverables:** Submission packages, meeting participation, and response to comments.

## Phase 4: Maintenance and Alignment

- **Goal:** Keep the open-source spec and any standardized versions in sync; promote adoption.
- **Deliverables:** Versioning policy, change process, and (where applicable) mapping between ADL versions and published standards (e.g., RFC numbers, ISO standard numbers).

---

## Milestones (Placeholder Dates)

| Milestone | Target | Notes |
|-----------|--------|--------|
| 0.1.0-draft published | — | Done when spec in `versions/0.1.0-draft/` is declared draft. |
| 0.2.0 draft (expanded schema) | TBD | After Identity, Capabilities, Tools, Policies sections are drafted. |
| First external implementation | TBD | Listed in IMPLEMENTATIONS.md. |
| First standardization submission | TBD | To be chosen (e.g., LF or IETF). |
| First published standard | TBD | Depends on body (e.g., RFC publication, ISO DIS). |

Updates to this roadmap should be proposed via pull requests and reflected in the repository changelog or release notes.
