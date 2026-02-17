---
description: Quick parallel review - spawn 5 randomly selected agents for rapid multi-perspective assessment
allowed-tools: Task
---

Rapidly spawn 5 randomly selected agents to review something from multiple angles simultaneously. Each agent works in parallel without coordination overhead. Random selection creates productive conflict and fresh perspectives each run.

## Quick Start

Tell us what you want reviewed:
- **What** — The proposal, spec change, decision, design
- **Constraints** — Timeline, compatibility, scope limits
- **Questions** — What you most need to understand

## Random Selection Strategy

5 agents are randomly selected from the 9-agent pool using this balanced approach:

**Selection Rules:**
- **2 Pioneers** (innovation-visionary, research-architect, implementation-engineer) — Drive innovation
- **2 Explorers** (market-validator, security-researcher, operations-engineer) — Validate feasibility
- **1 Settler/Resister** (enterprise-architect, compliance-officer, risk-assessor) — Reality check

**Available Agents:**

| Agent | Archetype | Focus | Model |
|-------|-----------|-------|-------|
| innovation-visionary | Pioneer | 10x innovation, future-readiness | opus |
| research-architect | Pioneer | Viability, patterns, adoption | opus |
| implementation-engineer | Pioneer | Feasibility, DX, production | sonnet |
| market-validator | Explorer | Value, competition, adoption | sonnet |
| security-researcher | Explorer | Threat modeling, compliance | opus |
| operations-engineer | Explorer | Reliability, observability, scale | sonnet |
| enterprise-architect | Settler | Governance, integration, legacy | sonnet |
| compliance-officer | Settler | Regulatory, audit, liability | opus |
| risk-assessor | Resister | Hidden risks, change impact | sonnet |

**Compute cost:** ~3 min (varies by selection)

## Why Random Selection?

- **Fresh perspectives**: Different agent combinations each run prevent groupthink
- **Productive conflict**: Unexpected pairings elicit creative tension
- **Manageable synthesis**: 5 viewpoints easier to synthesize than 9
- **Cost effective**: ~3 min vs ~5-7 min for all 9 agents

Each selected agent reviews from their domain:
- ✨ Is this visionary or incremental?
- 🔬 Does research back this approach?
- 💻 Can developers actually build it?
- 💰 Do customers value this?
- 🔐 Does it pass security/compliance?
- ⚙️ Will it operate reliably?
- 🏛️ Will enterprises adopt it?
- ⚖️ Are we exposed to regulatory risk?
- ⚠️ What hidden risks exist?

## Example Review Request

```
Review the proposal to make spec sections auto-generate from spec-manifest.yaml

Context:
Currently we manually update both spec.md and split MDX files. This creates
drift and maintenance burden. Proposal: auto-generate MDX from manifest structure.

Constraints:
- Must not break existing manually-crafted MDX enhancements
- Manual MDX overrides must be possible
- CI must validate generated content

Questions:
1. Is this over-engineering for the problem?
2. Will this break existing workflows?
3. Are there security/compliance implications?
4. How do we handle team resistance to automation?
```

## Output Format

Each agent provides:
1. **Assessment** — Their perspective on the proposal (2-3 key points)
2. **Red Flags** — Concerns from their domain
3. **Green Lights** — What they'd champion
4. **Critical Questions** — Unknowns remaining
5. **Recommendation** — Proceed / Revise / Block

## When to Use This (vs. `/review-with-team`)

- ✅ You need multiple perspectives **quickly**
- ✅ Agents don't need to coordinate or debate
- ✅ You want parallel processing (faster results)
- ✅ You have a tight timeline
- ❌ When you need agents to message each other
- ❌ When you need iterative consensus-building
- ❌ For complex decisions requiring debate/refinement

## Result

A comprehensive 360° review synthesizing:
- Innovation ambition with practical constraints
- Customer needs with operational reality
- Security rigor with compliance obligations
- Enterprise governance with change feasibility
- Risk awareness with breakthrough opportunity
