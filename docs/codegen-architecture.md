# ADL Codegen Architecture (`adlc`)

**Date:** 2026-06-20
**Status:** Draft / design
**Affects:** `packages/adl-generator`, a new `@adl-spec/codegen` runner + `@adl-spec/codegen-sdk`, the `adl` CLI, and the spec (a normative codegen-interface companion).
**Related:** [proposals/2026-05-26-documentation-generator-language-targets.md](../proposals/2026-05-26-documentation-generator-language-targets.md)

## Summary

ADL grows a dedicated code-generation toolchain, `adlc` ("Agent Development Lifecycle compiler"), separate from the authoring CLI (`adl`). It follows the **protoc/buf pattern**: a single source of truth (the ADL passport) is resolved once into a neutral intermediate representation, then a fan-out of `(language × framework)` plugins render idiomatic agent code. Plugins are defined against a **language-neutral contract expressed in JSON Schema** (the same vocabulary ADL already uses), so the ecosystem is not locked to any single implementation language.

The generated output is split into two lifecycles — **scaffold** (business logic, written once and owned by the user) and **managed** (spec-derived models, interfaces, and governance enforcement, regenerated on every build). Because the managed slice includes governance enforcement derived from the passport, editing one line of governance in the spec and re-running `adlc` updates the enforcement code identically across every language and framework. This is the capability an API-definition approach (OpenAPI/protobuf) structurally cannot provide, and the reason ADL does **not** delegate codegen to those ecosystems: agents are not APIs.

## Motivation

1. **Separation of concerns.** `adl` (validate/convert/init) is a lightweight authoring tool used by anyone editing specs. The codegen toolchain pulls in the generator engine, templates, and target plugins — a heavier, build-time concern for platform engineers. A team that only validates specs should not install the whole generator stack.
2. **A plugin ecosystem needs a stable, language-neutral contract.** Targets must be authorable by third parties in any language. A TypeScript interface only serves in-process JS/TS; a JSON-Schema contract plus a process protocol serves everyone.
3. **Spec-first, by construction.** Generated code is a build artifact regenerated from the passport, so the code can never drift behind the spec — and governance stays enforced in sync with the declared policy.
4. **Agents are not APIs.** The intermediate representation must carry autonomy, oversight, permissions, data classification, lifecycle, and identity — none of which an API IDL can express. Keeping the IR agent-native is what makes governance-aware codegen possible.

## Non-goals

- Bridging to `.proto` / OpenAPI as the primary path. (A community, explicitly *lossy* `adlc-gen-openapi` target may exist; it is not first-party and its lossiness is instructive, not recommended.)
- A generic, fully-orthogonal `language ⊥ framework` matrix engine. Framework idioms are language-bound; forcing orthogonality produces leaky abstractions. We factor along the managed/scaffold seam instead (see below).

## Architecture

### The protoc/buf pattern, applied

| Protobuf | ADL codegen |
|---|---|
| `.proto` source | `agent.adl.json` (the passport) |
| `protoc` compiler | `adlc` |
| `FileDescriptorSet` (fully resolved) | **`AgentIR`** (resolved, normalized) |
| `descriptor.proto` | `ir.schema.json` |
| `CodeGeneratorRequest` / `Response` | `generate-request` / `generate-response` schemas |
| `plugin.proto` | `@adl-spec/codegen-sdk` schemas |
| `protoc-gen-X` | `adlc-gen-<language>-<framework>` |
| stdin/stdout protobuf | stdin/stdout **JSON** |

The linchpin, exactly as in protoc: **`adlc` fully resolves the passport into the IR** (validate, apply defaults, expand profiles, flatten tool schemas) so plugins receive something unambiguous and never parse ADL themselves. That is what makes adding a language or framework cheap.

### Package layout

```
@adl-spec/core         ADL document types, parse, validate            (exists)
@adl-spec/codegen-sdk  plugin contract: JSON Schemas (canonical)      (new)
                       + generated TS types (convenience)
                       + a thin runtime helper for the stdin/stdout protocol
@adl-spec/generator    the engine: ADL -> IR transform + built-in     (exists; refactor)
                       targets; implements codegen-sdk
@adl-spec/codegen      the `adlc` runner: adl.config.json, scaffold,  (new)
                       generate, regenerate policy, plugin loading
@adl-spec/cli          `adl`: init, validate, convert                 (exists; shrink)
```

A plugin author depends only on `@adl-spec/codegen-sdk` (or, for non-JS languages, just the published JSON Schemas).

### The plugin contract (JSON Schema is canonical)

The contract has two halves. **Data shapes** are defined in JSON Schema (language-neutral, validatable anywhere). **Behavior** (how `adlc` invokes a plugin) is defined by a process protocol.

Canonical schemas (published in the spec and on `adl-spec.org`):

- `ir.schema.json` — the normalized `AgentIR`, the plugin's input and the stable contract that insulates plugins from ADL *schema* churn. Versioned independently of the ADL spec version.
- `generate-request.schema.json` — `{ apiVersion, ir, document, options }` (what `adlc` sends).
- `generate-response.schema.json` — `{ files: [{ path, content, role }] }` (what the plugin returns).
- `plugin-manifest.schema.json` — `{ id, label, language, framework, frameworkVersion?, apiVersion }`.

The TypeScript types in `@adl-spec/codegen-sdk` are **generated from these schemas** (the SDK dogfoods the managed-artifact model); the schema is the source of truth.

Two plugin flavors share the same contract:

1. **In-process (JS/TS).** Fast, ergonomic; implements the generated TS interface.
2. **Executable (any language).** `adlc` runs `adlc-gen-<language>-<framework>`, writes a `generate-request` (JSON) to stdin, reads a `generate-response` (JSON) from stdout. A Go/Python/Java author validates the request against the published schema, emits a response, done.

`adlc` validates the IR it sends **and** the response it receives against the schemas, so a malformed plugin fails fast with an actionable error instead of producing garbage.

### The IR is agent-native

The IR's spine is the agent, not a service. It carries what an API IDL cannot:

- identity / passport (provider, cryptographic identity, lifecycle status)
- autonomy tier and human-oversight triggers
- permission boundaries (network / filesystem / tool allow-lists)
- data-classification posture
- tools as **governed capabilities** (`requires_confirmation`, `read_only`), not bare endpoints
- declared profiles (governance / financial / healthcare) and their obligations

Tool parameters still become typed models — but they live inside the agent model, framed as capabilities, not as standalone DTOs.

### Two output lifecycles: scaffold vs managed

Every generated file declares a **role**:

- **`managed`** — spec-derived, non-business-logic: models, interfaces, tool schemas, and **governance enforcement hooks**. Overwritten on every build; not hand-edited.
- **`scaffold`** — business logic and project setup (the agent implementation, manifests). Written once on first scaffold, then owned and edited by the user.

The user controls policy with a clean per-entry **enum** (no globs):

| `regenerate` | managed files | scaffold files | use case |
|---|---|---|---|
| `sync` *(default)* | overwrite | write once | scaffold once, keep models + governance in sync |
| `overwrite` | overwrite | overwrite | whole dir is a disposable build artifact |
| `once` | write once | write once | scaffold and freeze |

`adl scaffold` does the one-time full generation and **emits `adl.config.json`** with the classification, so the user gets it automatically. `adlc generate` (or `adl generate`) does the continuous pass.

### Governance runtime: a port, not a third axis

A naive design makes governance runtime a third multiplicative axis (`language × framework × runtime`) — a combinatorial bomb. Instead:

- **Policy is neutral** — autonomy, oversight, permissions, classification live in the passport → IR, shared by everyone.
- **The runtime is a port.** A language-neutral **governance-runtime interface** answers: is this tool call permitted? does it require human approval? record this classified access; escalate this. Enforcement hooks call the interface; the runtime behind it is swappable.
- **First-party reference runtime, cross-language** (Python + TS + Java) as the default backend; alternatives (OPA, Cedar, framework-native human-in-the-loop, an enterprise policy engine) implement the same interface without touching generated code.

So the surface stays **additive**: `(L × F)` targets + `(L)` governance clients + one neutral policy — never `L × F × G`. Governance runtime is to *enforcement* what the agent framework is to *wiring*.

#### Two enforcement planes (codegen + platform)

The interface is a **decision/enforcement contract** in the PDP/PEP shape (Policy Decision Point / Policy Enforcement Point), specified transport-neutrally (JSON-Schema'd decision request/response) so it can be satisfied in three ways:

1. an **in-process library call** — the generated managed hooks consult a local reference client;
2. a **network call to a platform policy service** — the platform hosts the decision point and returns allow / deny / require-approval / log + obligations;
3. a **platform enforcement point** — a gateway, sidecar, or tool-call broker that intercepts the agent's actions (tool calls, network egress, data access) at the boundary.

This yields two complementary planes:

- **In-process (cooperative).** Generated `managed` hooks enforce inline — fast and fine-grained, but it trusts the agent process.
- **Platform (independent).** A control plane **verifies the agent's signed passport**, derives the same policy, and enforces it at the boundary regardless of what the agent binary does — tamper-resistant runtime protection / defense-in-depth.

Both planes consume the **same passport-derived policy**, so generated code and a platform enforce identical rules by construction. The signed passport is the shared trust anchor: a platform that trusts a passport can enforce its declared envelope (autonomy tier, permission allow-lists, oversight triggers, data-classification handling) **without trusting the agent's code**. This is what lets a platform offer runtime protection for *any* ADL agent, generated by `adlc` or not.

The full decision schema and platform enforcement model are large enough to warrant their own companion design doc; this document only fixes that the interface is transport-neutral and dual-plane so the codegen contract and a platform speak the same language.

**The payoff.** Enforcement hooks are `managed`. Change a tool to `requires_confirmation`, drop an autonomy tier, or remove a host from the allow-list, re-run `adlc`, and the enforcement code updates itself identically across every language and framework, while business logic stays put:

> Edit one line of governance in the passport → `adlc generate` → the approval gate appears in `python/langgraph`, `typescript/adk`, `java/spring-ai` — all at once.

### Avoiding combinatorial explosion

We do **not** build a generic language⊥framework grid. We factor along the managed/scaffold seam, which happens to align with the two axes:

- **models/types** (`managed`) depend on **language only** → one **model-renderer per language**, first-party, reused across every framework in that language.
- **wiring + enforcement** (`managed` + `scaffold`) depend on **`(language × framework)`** → per-cell adapters that compose the shared renderer.

Reuse lives in each language's own ecosystem: a first-party `adl-codegen-python` (pip) and `@adl-spec/codegen-ts` (npm) and `adl-codegen-java` (Maven) library renders IR → idiomatic types + governance helpers; framework plugins in that language depend on it. Adding a new framework to a language you already support is "just the wiring."

## Target matrix

Targets are a **sparse `(language × framework)` grid** — populate cells where a framework actually exists. Availability verified 2026-06-20 (sources below).

| framework | python | typescript | java |
|---|:---:|:---:|:---:|
| vanilla (no framework) | ✓ | ✓ | ✓ |
| **adk** (Google ADK) | ✓ official | ✓ official (`google/adk-js`) | ✓ official (1.0) |
| claude-sdk (Claude Agent SDK) | ✓ official | ✓ official | — (no Java Agent SDK) |
| langgraph | ✓ official | ✓ official (`@langchain/langgraph`) | ⚠ community (`langgraph4j`) |
| spring-ai | — | — | ✓ (enterprise-native) |

Parity stories this enables:

- **ADK across all three languages** — the strongest single-framework parity demo: one passport → an idiomatic ADK agent in Python, TypeScript, and Java.
- **python ↔ typescript** also via `claude-sdk` and `langgraph` (official in both).
- **java enterprise** via `spring-ai` (native) and `adk` (the cross-language bridge).

Notes:
- Claude Agent SDK has no Java implementation; the Anthropic *API* client libraries (Java/Go/Ruby/…) are a different thing and do not provide the agent loop.
- `langgraph4j` is a community port that works with LangChain4j and Spring AI — usable, but not first-party LangChain. Treat `java/langgraph` as community/optional, after the core grid.

## Phasing

1. **Python + TypeScript first.** Rename the existing TS targets to `typescript/{vanilla,claude-sdk,langgraph}`; add ADK (`typescript/adk`); build the Python renderer + `python/{vanilla,adk,claude-sdk,langgraph}`. Two languages immediately pressure-test the IR's neutrality.
2. **Java for the enterprise demo.** `java/{vanilla,adk,spring-ai}`, with ADK as the cross-language bridge and Spring AI as the enterprise-native pitch.
3. First-party throughout: per-language model renderers (py/ts/java), the framework adapters above, and the governance-runtime reference clients (py/ts/java).

## Resolved decisions (2026-06-20)

1. **Spring AI is in the first Java cut.** `java/{vanilla,adk,spring-ai}`.
2. **Build a first-party ADL reference governance runtime** (py/ts/java) as the default backend, with OPA/Cedar/etc. as alternates behind the interface. The interface (JSON Schema) is defined before any runtime — **and it must be designed so a platform can implement it for runtime protection**, not only an in-process library (see "Two enforcement planes" above). This warrants its own companion design doc.
3. **Enforcement hooks are `managed`.** If someone overwrites them in code, the next `adlc generate` rewrites them — governance can't be quietly edited out.
4. **`adlc` protocol is JSON-only** for now, with request/response framed so a future encoding (e.g. protobuf) could slot in.
5. **The SDK's TS types are generated from the JSON Schemas** (schema is canonical).

## Open follow-ups

- A companion design doc for the **governance-runtime interface + platform enforcement** (decision schema, PDP/PEP model, passport-as-trust-anchor, platform integration patterns).

## Alternatives considered

- **Keep codegen in `@adl-spec/cli`.** Rejected: bloats the authoring tool with build-time deps and flags.
- **Fold the runner into `@adl-spec/generator`.** Viable, but mixes library and CLI concerns; keeping the engine a pure library lets other tools embed it.
- **Delegate models to `.proto` / OpenAPI.** Rejected: gives per-language *models* but never agent-code-per-`(language × framework)`, and teaches that agents are APIs. See Non-goals.
- **TypeScript-only targets (status quo).** Rejected: does not prove the language-neutral thesis and misses Python (the agent lingua franca) and Java (the enterprise/governance audience).

## References

- Prior proposal: [Documentation Generator Language Targets and Code-to-ADL Strategy](../proposals/2026-05-26-documentation-generator-language-targets.md)
- ADK for Java 1.0.0 — https://developers.googleblog.com/announcing-adk-for-java-100-building-the-future-of-ai-agents-in-java/
- ADK for TypeScript (official `google/adk-js`) — https://developers.googleblog.com/introducing-agent-development-kit-for-typescript-build-ai-agents-with-the-power-of-a-code-first-approach/ and https://google.github.io/adk-docs/get-started/typescript/
- Claude Agent SDK (TypeScript) — https://github.com/anthropics/claude-agent-sdk-typescript
- Claude Agent SDK (Python) — https://github.com/anthropics/claude-agent-sdk-python
- LangGraph JS/TS — https://reference.langchain.com/javascript/langchain-langgraph
- LangGraph4j (community Java) — https://github.com/langgraph4j/langgraph4j
- Spring AI tool calling (2.0) — https://spring.io/blog/2026/06/15/spring-ai-composable-tool-calling/
