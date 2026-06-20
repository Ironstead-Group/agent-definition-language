# Governance Runtime Interface

**Date:** 2026-06-20
**Status:** Draft / design
**Companion to:** [docs/codegen-architecture.md](./codegen-architecture.md)
**Builds on:** Runtime Protocol §1 (the governor, PDP/PEP), §5 (oversight triggers), §6 (degradation), §8 (enforcement evidence), Conformance Tiers; Spec §10.3.1 (passport verification) and §10.3.2 (presentation proof).
**Likely home:** a new Runtime Protocol section + standalone JSON Schemas (`decision-request.schema.json`, `decision-response.schema.json`), mirroring how Enforcement Evidence added §8 + `schema-enforcement-record.json`.

## Summary

The Runtime Protocol already defines the **governor** — the control authority that hosts a policy decision point (PDP) and policy enforcement point (PEP), bound to the agent's passport, that turns declared limits (budget, iteration, sub-agents, oversight, anomaly) into runtime decisions. What it does **not** define is a **portable decision contract**: a transport-neutral request/response shape that lets *different* governor implementations be substituted and lets non-governor code (a generated agent, a platform gateway) ask a governor for a decision.

This document specifies that contract. It is the seam that makes governance enforcement work in two places at once:

1. **codegen** — the `managed` enforcement hooks `adlc` emits are in-process PEPs that consult a PDP through this contract;
2. **platform** — a platform hosts a governor (PDP + boundary PEPs) that verifies an agent's signed passport and enforces its declared envelope at the boundary, **independent of the agent's code**, giving runtime protection to *any* ADL agent — generated or not.

Both consume the same passport-derived policy, so they enforce identical rules by construction. One contract, two enforcement planes.

## Motivation

- The Runtime Protocol specifies the governor's *behavior* (§2–§8) and that a governor hosts a PDP and PEP (§1.2) — but a PDP is only pluggable if "ask for a decision" has a defined, language-neutral shape. Without it, every governor is a bespoke implementation and generated code can't target "any conforming governor."
- Codegen needs to emit enforcement hooks **once per `(language × framework)`** that call *whatever* governor is configured — the in-process reference runtime in dev, a platform control plane in production — without changing the generated code.
- Platforms want to enforce governance for agents they did not build. Because the policy comes from the **signed passport**, a platform that trusts the passport can enforce the declared envelope without trusting the agent binary — but only if there's a defined decision contract and PEP model to implement.

## Relationship to existing work (no redefinition)

This contract **reuses**, and does not replace:

- **Governor / PDP / PEP** — Runtime Protocol §1.2. This doc defines the wire shape the PDP speaks; it does not change what a governor is.
- **Decision inputs** — the declared members the PDP evaluates (`budget` §2, iteration §3, sub-agents/delegation §4, `human_oversight.triggers` §5, `anomaly_baseline` §7) and the structured oversight predicate vocabulary (`cost_usd_over`, `data_classification_at_least`, `tool`, `path_matches`).
- **Enforcement responses** — Runtime Protocol §6 degradation responses are the PEP's action vocabulary; the decision response references them rather than inventing new verbs.
- **Evidence** — a governor that enforces through this contract still emits §8 enforcement records (hash-chained, governor-signed). The contract is how decisions are *requested*; §8 is how enforcement is *proven*.
- **Trust** — passport authentication (§10.3.1) and presentation proof (§10.3.2) are how a platform governor establishes which policy to enforce and that the presenter holds the passport.
- **Conformance Tiers** — R1 observe-only vs R2+ enforce are unchanged; a governor reached through this contract claims tiers exactly as today.

## The decision contract (PDP wire shape)

Transport-neutral JSON, validated against published schemas, callable **in-process** (a function) or **over the network** (a platform PDP service).

**Decision request** — an action in context, presented before the PEP admits it:

```jsonc
{
  "apiVersion": "1",
  "passport": { "id": "urn:...", "digest": "sha-256:..." },  // which envelope is in force
  "session": "sess_abc",                                       // for per-session counters (§1.3)
  "action": {
    "kind": "tool_call",            // tool_call | model_call | network | sub_agent | delegation | data_access
    "tool": "file_sar",
    "arguments_digest": "sha-256:...", // hash, not raw args, by default (privacy)
    "target_host": "fincen.gov",
    "data_classes": ["pii", "financial"],
    "estimated_cost_usd": 0.0,
    "autonomy_tier": 1
  }
}
```

**Decision response** — a verdict plus obligations, drawn from the existing vocabulary:

```jsonc
{
  "decision": "allow",          // allow | deny | require_approval | throttle | halt
  "reason": "within declared envelope",
  "degradation": "on_tool_error", // when denying/halting, the §6 response key that applies
  "obligations": [               // PEP MUST satisfy these if it proceeds
    { "kind": "log", "to": "governance_record_ref" },
    { "kind": "redact", "fields": ["narrative"] },
    { "kind": "require_approver_role", "role": "Compliance Officer" }
  ],
  "ttl_seconds": 0               // 0 = do not cache; decisions over classified actions are typically uncacheable
}
```

`require_approval` is **asynchronous** — it maps to the §5 pause-for-review-and-timeout procedure, so the contract carries an approval handle/callback, not a blocking boolean.

## Two enforcement planes

| | In-process (codegen) | Platform (control plane) |
|---|---|---|
| **PEP location** | the `managed` hooks `adlc` emits, inside the agent | gateway / sidecar / tool-call broker / egress proxy |
| **PDP** | local reference governor (a library) | platform-hosted governor service |
| **Trusts** | the agent process | only the **signed passport** (§10.3.1/§10.3.2), not the code |
| **Granularity** | per call, in full context | boundary-level (network, tool I/O) |
| **Strength** | fast, ergonomic, in-context | tamper-resistant; works for agents it didn't build |

They are not alternatives — they're defense-in-depth. The generated hooks give cooperative, fine-grained enforcement and good DX; the platform plane survives a modified or compromised agent. Because enforcement hooks are **`managed`** (codegen doc), an attempt to edit them out of the source is rewritten on the next `adlc generate`, and the platform plane catches what in-process enforcement cannot be trusted for.

## How a platform implements runtime protection

A platform is simply a governor whose PEPs live at infrastructure boundaries it controls:

1. **Admit** the agent — verify the passport (§10.3.1) and a presentation proof (§10.3.2) so a leaked passport grants no capability.
2. **Derive policy** — the same passport → IR policy the codegen uses (autonomy tier, permission allow-lists, oversight predicates, classification rules, budgets).
3. **Insert PEPs** at boundaries and consult the PDP via the decision contract:
   - **egress proxy** → network `allowed_hosts` / `deny_private`
   - **tool-call broker / MCP gateway** → `requires_confirmation`, `read_only`, autonomy-tier gating
   - **data interceptor** → classification handling, redaction obligations
   - **oversight router** → §5 pause/escalate on trigger
   - **budget/iteration meter** → §2/§3 ceilings, fail-closed
4. **Emit evidence** — produce §8 enforcement records so a counterparty can verify enforcement actually happened at the claimed tier.

The result: **runtime protection for any ADL agent**, because the contract is the passport, not the code. `adlc`-generated agents get belt-and-suspenders (in-process + platform); third-party or hand-written agents still get platform-plane protection from their passport alone.

## Fail-open vs fail-closed

Consistent with the Runtime Protocol: when the PDP is unreachable or returns no decision, the PEP **defaults to fail-closed** (deny/halt), matching §2's budget-exhausted default. A platform MAY offer a configured fail-open mode for low-risk action kinds, but the safe default is fail-closed, and the choice is itself auditable.

## Codegen integration

- `adlc` emits, per `(language × framework)`, `managed` PEP hooks at each governed action site (tool wrapper, network client, sub-agent spawn).
- The hooks call a **per-language governance client** (`adl-codegen-python` / `@adl-spec/codegen-ts` / `adl-codegen-java`) that implements the decision contract.
- The client's PDP target is configuration, not code: **in-process reference governor** (dev/local) or a **remote platform governor** (prod). Switching planes never regenerates code.
- Because hooks are `managed`, a passport governance change → `adlc generate` → updated hooks across every language and framework at once.

## Open questions

1. **Arguments: digest vs full.** Default to `arguments_digest` for privacy; allow opt-in full-argument decisions where a policy genuinely needs values (e.g. amount thresholds). Where does the threshold evaluation happen — PDP with values, or PEP pre-computing a predicate result?
2. **Decision caching.** `ttl_seconds` enables caching idempotent allows (e.g. a read-only tool); classified or approval-gated actions are uncacheable. Confirm the cache-key model.
3. **Remote PDP latency.** In-process is sub-µs; a network PDP adds a hop per action. Batch/streaming decision modes? Local PEP with a cached policy snapshot + async audit?
4. **Approval transport.** `require_approval` is async (§5). Define the approval handle, callback, and timeout binding in the contract.
5. **Schema home + naming.** New Runtime Protocol section + `decision-request/response.schema.json`, versioned with their own `apiVersion` (independent of ADL spec version), like the enforcement record.

## References

- Runtime Protocol — `protocol/draft/runtime-protocol.md` (§1 governor/PDP/PEP, §5 oversight, §6 degradation, §8 evidence, Conformance Tiers)
- [proposals/2026-05-29-structured-oversight-triggers.md](../proposals/2026-05-29-structured-oversight-triggers.md)
- [proposals/2026-05-29-enforcement-evidence.md](../proposals/2026-05-29-enforcement-evidence.md)
- [proposals/2026-05-03-passport-verification-procedure.md](../proposals/2026-05-03-passport-verification-procedure.md)
- [proposals/2026-05-04-passport-presentation-proof.md](../proposals/2026-05-04-passport-presentation-proof.md)
- [docs/codegen-architecture.md](./codegen-architecture.md)
