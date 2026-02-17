---
description: Create a persistent team of 5 randomly selected agents for coordinated debate and consensus-building
allowed-tools: TeamCreate, SendMessage
---

Create a persistent team of 5 randomly selected agents that can message each other, share a task list, and build consensus through debate. Random selection creates productive conflict and fresh team dynamics each run. Use when you need iterative refinement and coordination.

## Random Team Selection

5 agents are randomly selected from the 9-agent pool using this balanced approach:

**Selection Strategy:**
- **2 Pioneers** (innovation-visionary, research-architect, implementation-engineer) — Drive innovation
- **2 Explorers** (market-validator, security-researcher, operations-engineer) — Validate feasibility
- **1 Settler/Resister** (enterprise-architect, compliance-officer, risk-assessor) — Reality check

**Agent Pool:**

**PIONEERS (3) — Innovators & Early Adopters**
- `innovation-visionary` — Breakthrough thinking, challenges status quo, 10x mindset
- `research-architect` — Research-backed validation, enterprise viability paths
- `implementation-engineer` — Real-world feasibility, developer experience

**EXPLORERS (3) — Early Majority & Risk-Takers**
- `market-validator` — Customer value, competitive positioning, market fit
- `security-researcher` — Threat modeling, compliance alignment (NIST, SOC 2, ISO)
- `operations-engineer` — Production readiness, reliability, observability

**SETTLERS (2) — Late Majority & Pragmatists**
- `enterprise-architect` — Governance, legacy integration, backward compatibility
- `compliance-officer` — Regulatory exposure, audit trails, liability

**RESISTER (1) — Status Quo Defender**
- `risk-assessor` — Hidden risks, change blockers, stress testing

## How to Use

Describe what you want reviewed:

1. **What** — Spec change, proposal, architecture decision, design, etc.
2. **Why** — Context and business drivers
3. **Constraints** — Timeline, compatibility requirements, target audience
4. **Questions** — Critical unknowns you need resolved

## Example

```
Review: Proposed change to agent identity model

Context:
Replacing X.509 certificates with decentralized W3C DIDs for better interoperability

Constraints:
- Must maintain backward compatibility for 2 years
- Target: Fortune 500 enterprises
- Timeline: Q3 2026 pilot

Key questions:
1. Is this architecturally sound for 2030?
2. Can enterprises actually adopt it?
3. What security/compliance gaps exist?
4. How do we migrate existing deployments?
```

## What You Get

- **Innovation Assessment** — Is this breakthrough or incremental?
- **Research Validation** — Is there evidence backing this?
- **Feasibility Reality Check** — Can we actually build this?
- **Market Fit** — Will customers adopt this?
- **Security/Compliance** — Are we meeting regulatory requirements?
- **Operational Soundness** — Will this run reliably at scale?
- **Enterprise Viability** — Does it work in large organizations?
- **Regulatory Safety** — Is there liability exposure?
- **Risk Surface** — What could go wrong?

## When to Use This (vs. `/team-review`)

- ✅ You need **iterative refinement** of a decision
- ✅ Agents need to **message each other** and debate
- ✅ You want **consensus-building** across perspectives
- ✅ Complex decisions requiring **team dynamics**
- ✅ You have time for productive tension/debate
- ❌ When you need results quickly
- ❌ When agents don't need to coordinate
- ❌ When parallel independent reviews are sufficient

## Team Dynamics

In a persistent team, productive tension emerges:
- Pioneers push boundaries → Explorers validate with data
- Explorers gather evidence → Settlers ground in reality
- Settlers demand governance → Resister identifies true blockers
- Resister surfaces risks → Pioneers find creative solutions

Result: Balanced decisions that are both innovative AND viable, shaped by team dialogue
