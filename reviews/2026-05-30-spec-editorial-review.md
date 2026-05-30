# ADL Draft Specification — Editorial & Standards Review

**Reviewer role:** IETF/ISO-style specification editor and proof-reader
**Date:** 2026-05-30
**Documents reviewed:**
- `versions/draft/spec.md` — ADL Core, v0.3.0-draft (1771 lines)
- `protocol/draft/trust-protocol.md` — Trust Protocol, v0.1.0-draft
- `protocol/draft/runtime-protocol.md` — Runtime Protocol, v0.1.0-draft
- `protocol/draft/index.md` — Protocol layer overview
- `versions/draft/schema-discovery.json`
**Lens:** The review rates each section against the thesis of *"Governance is Changing Meaning in AI"* — that governance must move from **constitution** (documentation, pre-deployment approval) to **operating system** (runtime enforcement with teeth: would it *stop* the 2 a.m. rogue agent, or merely *document* it afterward?). For ADL Core, "teeth" cannot live in Core itself — Core declares — so the relevant question for each section is whether it (a) carries a declaration the protocol layer can enforce, (b) is necessary descriptive plumbing, or (c) **overclaims** enforcement Core cannot deliver, which weakens the thesis by blurring declaration and enforcement.

---

## How to read this document

Each finding carries a severity:

- **[BLOCKER]** — a contradiction or dangling normative reference that would fail editorial review or mislead an implementer.
- **[MAJOR]** — a real inconsistency or gap across documents; should be fixed before the next milestone.
- **[MINOR]** — narrow correctness or completeness issue.
- **[EDITORIAL]** — wording, RFC-2119 hygiene, capitalization, or positioning.

Thesis tags: **STRENGTHENS** / **NEUTRAL** / **WEAKENS** (relative to the runtime-teeth thesis).
Placement tags: **KEEP** / **→PROTOCOL** / **→PROFILE** / **SPLIT**.

---

## Part 1 — Cross-cutting findings (highest value)

These cut across multiple sections and are where the editorial risk concentrates.

### CC-1 [BLOCKER] Dangling `autonomy` member
§3 Terminology (line 98) states: *"ADL expresses the degree of permitted autonomy through the `autonomy` member and governance profile tiers."* There is **no `autonomy` member** anywhere in Core: it is absent from the §4.2 top-level optional-members list and has no defining section. This is a normative reference to a member that does not exist.
**Action:** Either (a) add an `autonomy` member section + schema + §4.2 list entry, or (b) if autonomy lives only in the Governance Profile, change the sentence to *"…through governance profile tiers"* and drop the `autonomy` member clause. Recommend (b) unless an autonomy member is actually planned for Core.

### CC-2 [BLOCKER] `ADL-1006` error code is mis-mapped
§7.2 (line 426) says an undefined template variable *"**MUST** treat this as an error (error code ADL-1006)."* But §16.2 defines `ADL-1006` as **"Value does not match pattern"** (a Schema-category code). An undefined template variable is not a pattern-match failure.
**Action:** Allocate a distinct code (e.g., a new `ADL-2xxx` "Undefined template variable") and update §7.2, or repoint §7.2 to the correct existing code. Do not leave a member-level normative requirement pointing at an unrelated error.

### CC-3 [MAJOR] VAL rules VAL-29…VAL-35 have no corresponding error codes
§14.2 added VAL-29 (budget > 0), VAL-30 (per_session ≤ per_day), VAL-31 (degradation action enum), VAL-32 (iteration integers ≥ 1), VAL-33 (loop_detection.window ≥ 2), VAL-34 (sub_agents pattern), VAL-35 (max_depth ≥ 1). The §16.2 error-code table stops at `ADL-2023` (high-water mark) and contains **no codes** for any of the new runtime-governance validations. Every other VAL rule has a paired `ADL-xxxx` code; these seven break that invariant.
**Action:** Add `ADL-2024`…`ADL-2030` (or a `ADL-6xxx` runtime-limits band) covering the seven new rules, mirroring the existing VAL↔code pairing. This is also a *thesis* issue: the runtime-teeth declarations are the new heart of the spec, and they are the only validated members with no diagnostic vocabulary.

### CC-4 [MAJOR] `adl_discovery` required by schema but not by §6.4 prose
`schema-discovery.json` makes `adl_discovery` (const `"1.0"`) a **required** top-level member, and the §6.4 example includes it (line 366). But the §6.4 **prose** requirement (lines 348–360) says only that the document *"**MUST** contain an `agents` array"* and never mentions `adl_discovery`. Prose and schema disagree on what is required.
**Action:** Add `adl_discovery` to the §6.4 prose as a REQUIRED member ("**MUST** contain `adl_discovery` with value `\"1.0\"`"), so the normative text matches the schema artifact.

### CC-5 [MAJOR] Pervasive version drift: `0.2.0` / `0.2` in a 0.3.0-draft document
The document header is `0.3.0-draft`, but:
- §5.1 example: `"adl_spec": "0.2.0"` (line 208)
- §5.2: *"Canonical schema URI for ADL 0.2: `https://adl-spec.org/0.2/schema.json`"* (line 212)
- §4.3, §13.6 examples: `"adl_spec": "0.2.0"` (lines 147, 1255)
- §13.3, Appendix A: `https://adl-spec.org/0.2/schema.json` (lines 1199, 1686)
- §17.2 registry: profiles target *"ADL compatibility 0.1.x"* (lines 1526, 1539)

Note the constraint in §5.1 that `adl_spec` **MUST NOT** carry a pre-release suffix, so examples legitimately cannot say `0.3.0-draft`; they should reference the **last released** version deliberately, not drift. But §5.2's "ADL 0.2" canonical-URI sentence and the Appendix A schema URL are stale relative to the current draft line.
**Action:** Decide the policy and apply it uniformly: (a) examples pin to the latest *released* `adl_spec` (state this once), and (b) the §5.2 / §13.3 / Appendix A schema URIs and the §17.2 "0.1.x" compatibility strings are refreshed to the draft's line. Add a one-line note in §5.1 explaining why examples carry a released version, to pre-empt reviewer confusion.

### CC-6 [MAJOR] Core §10.4 cross-reference `§10.3.2.2` does not resolve
§10.4 (line 939) cites *"the presentation proof's `scopes` member (§10.3.2.2)."* Core §10.3.2 is only a **pointer stub** to the Trust Protocol; there is no §10.3.2.2 in Core. The proof structure (and its `scopes` member) is defined in **Trust Protocol §1.2.2**.
**Action:** Change the citation to "Trust Protocol §1.2.2". Sweep for other `§10.3.x.x` / `§10.4.x` deep references that assume Core still hosts the procedural detail that moved to Trust.

### CC-7 [MAJOR] "passport," "counterparty," and "runtime governor" are undefined in Core terminology
These three terms are the spine of the entire family. "Passport" is defined inline in §1.3 and again in Trust Protocol; "counterparty" and "runtime governor" are used normatively across Core §9.6/§9.7/§11.3/§11.5 and both protocols but appear in **no** Terminology entry (§3). ISO/IETF practice is to define load-bearing terms once, centrally, in the document other documents depend on.
**Action:** Add §3 entries for **passport**, **counterparty**, **runtime governor** (and consider **enforcement record**). Core is the right home because both protocols normatively reference Core. The protocols then cite Core §3 rather than re-defining. This directly serves the thesis by naming the governor as a first-class term in the foundational document.

### CC-8 [MAJOR] "enforceable" in §1.1 overclaims for Core alone — the central thesis tension
§1.1 Purpose lists: *"**Security:** Permission boundaries and security requirements are explicitly declared **and enforceable**."* Core declares; it does not enforce (the spec itself repeatedly says so: §9.6, §11.5, "Core declares; the protocols enforce"). Asserting enforceability as a Core property is exactly the constitution/operating-system conflation the article warns against.
**Action:** Reword to locate the teeth correctly: *"**Security:** Permission boundaries and security requirements are explicitly declared, and **carry runtime force through the protocol layer** (see Trust and Runtime Protocols)."* See also FR-1 below (adding an enforcement bullet to the Purpose list).

### CC-9 [MINOR] "ADL Document" vs "ADL document" capitalization
Core uses lowercase "ADL document" throughout (consistent with the §3 definition). Trust Protocol uses capitalized "ADL Document" (lines 26, 28) alongside lowercase elsewhere. Pick one. A defined term is conventionally lowercase unless it is a proper title.
**Action:** Normalize the protocols to "ADL document" (or define "ADL Document" as a capitalized defined term in Core §3 and use it consistently everywhere). Low effort, improves the standards-grade polish.

### CC-10 [EDITORIAL] Nine RFC-2119-ambiguous "May contain:" lead-ins
§9.2, §9.3, §9.4, §9.5, §9.6, §11.1, §11.2, §11.3, §11.4 each open member descriptions with *"May contain: …"*. Capitalized "May" at sentence start reads as an RFC-2119 **MAY** but is not all-caps, so it is neither a clean keyword nor clean prose — exactly the ambiguity RFC 8174 exists to remove.
**Action:** Reword to non-keyword prose, e.g. *"The `network` object can contain `allowed_hosts`, …"* This removes the ambiguity without changing meaning (these are descriptive lists, not normative grants).

---

## Part 2 — Section-by-section review

Legend: **Thesis** (STRENGTHENS / NEUTRAL / WEAKENS) · **Placement** (KEEP / →PROTOCOL / →PROFILE / SPLIT).

### §1 Introduction
| Sub | Thesis | Placement | Notes & actions |
|-----|--------|-----------|-----------------|
| 1.1 Purpose | WEAKENS | KEEP | "enforceable" overclaim — **CC-8**. The five "enables" bullets (Discovery, Interoperability, Deployment, Security, Lifecycle) predate the runtime-teeth thesis and do not represent enforcement/accountability at all — see **FR-1**. |
| 1.2 Goals | NEUTRAL | KEEP | "Secure" goal fine. Consider a sixth goal — **Accountable/Enforceable** — to align the goal set with the protocol layer. |
| 1.3 Design Model | STRENGTHENS | KEEP | Strong. Passport/document distinction and "Core declares; the protocols enforce" is the thesis in miniature. Principle 1 wording ("interact with the agent and whether to act on its requests") is good. Minor: this is where **passport** is effectively *defined* — once §3 gains a passport entry (**CC-7**), make §1.3 reference it rather than re-define. |
| 1.4 Relationship to Other Specs | NEUTRAL | KEEP | Fine. Consider adding A2A/MCP as *informative* anchors for the runtime-governor deployment shapes (gateway/sidecar) named in Runtime §1.1. |

### §2 Requirements Language — NEUTRAL · KEEP
Standard BCP-14 boilerplate. Correct. No action beyond enforcing it (see CC-10 and the lowercase-"may" sweep).

### §3 Terminology — NEUTRAL · KEEP (but incomplete)
Good ISO-22989 anchoring. **CC-1** (dangling `autonomy` member) and **CC-7** (missing passport/counterparty/governor) both land here. The `autonomy` term is defined but the *member* it advertises does not exist — fix or rephrase.

### §4 Document Structure
| Sub | Thesis | Placement | Notes |
|-----|--------|-----------|-------|
| 4.1 Media Type | NEUTRAL | KEEP | Solid. JSON-canonical/YAML-authoring split is clear. |
| 4.2 Top-Level Object | NEUTRAL | KEEP | Optional-members list omits `extensions` (defined in 4.3 as reserved at every level, including top). Add a parenthetical so the top-level inventory is complete. `data_classification` correctly listed as required. |
| 4.3 Extension Mechanism | NEUTRAL | KEEP | Well-specified; reverse-domain namespacing is sound. |
| 4.4 Pattern Matching | STRENGTHENS | KEEP | This is enforceable substrate (deny/allow patterns the governor and runtime act on). Clear and testable. |

### §5 Core Members — NEUTRAL · KEEP
5.1–5.6 are clean. **CC-5** (version drift) touches 5.1/5.2. §5.6 Lifecycle is strong and *is* a runtime boundary (retired ⇒ MUST NOT provision); §18.12 correctly elevates it to a security boundary — good cross-linking. Consider noting in §5.6 that lifecycle gating is *enforced* at admission by Trust Protocol §1.1.7 (forward reference parallels the §9.6/§11.5 pattern).

### §6 Agent Identity
| Sub | Thesis | Placement | Notes |
|-----|--------|-----------|-------|
| 6.1 Id | STRENGTHENS | KEEP | Identifier hierarchy (HTTPS > did:web > URN) underpins verifiability. Good. |
| 6.2 Provider | NEUTRAL | KEEP | Fine. |
| 6.3 Cryptographic Identity | STRENGTHENS | KEEP | Enforceable trust root. Weak-algorithm guidance good. |
| 6.4 Discovery | STRENGTHENS | KEEP | The triage `description` (≤256) and "publishing = inviting connection" framing align with the thesis (controlled admission). **CC-4** (adl_discovery required-in-schema-not-prose) lands here. Also: §6.4 prose says "served with media type `application/json`" while the document is `application/adl+json` elsewhere — the discovery doc is a *separate artifact*, so `application/json` is defensible, but state explicitly that the discovery document is **not** an ADL document and intentionally uses `application/json`. |

### §7 Model Configuration — NEUTRAL · KEEP
7.1/7.2 are necessary description ("constitution" plumbing, not "operating system"), which is fine — not every section must carry teeth. **CC-2** (ADL-1006 mis-map) is in §7.2. Template-injection teeth live correctly in §18.3.

### §8 Capabilities — NEUTRAL · KEEP
Tools/resources/prompts. `requires_confirmation` (§8.1) is a genuine runtime gate and is correctly enforced in §18.12 ("MUST receive explicit user confirmation … MUST NOT invoke autonomously"). Consider surfacing `requires_confirmation` in the Runtime Protocol's oversight section (§5) as a per-tool, always-on oversight trigger — right now it is only enforced via §18.12 prose, not by the governor procedure. **(See FR-3.)**

### §9 Permissions — STRENGTHENS · KEEP
The enforceable core. Deny-by-default (§9.1) and conflict resolution are exactly right for the thesis.
| Sub | Notes |
|-----|-------|
| 9.6 Resource Limits / `budget` | STRENGTHENS. Budget envelope is prime "teeth." **Asymmetry to flag:** Runtime Protocol §2 enforces `budget` but is silent on the sibling `max_memory_mb` / `max_cpu_percent` / `max_duration_sec` / `max_concurrent` in the same object. Either state that those are OS/platform-enforced (out of governor scope) or give the governor a procedure for them. Right now a reader cannot tell whether they have teeth. |
| 9.7 Sub-Agents | STRENGTHENS. Attenuation (scopes_subset / budget_subset) + deny-by-default is excellent. Correctly defers admission procedure to Runtime §4 and chain verification to Trust. |

### §10 Security — SPLIT (already done) · KEEP declarations
The §10 preamble (lines 698–700) cleanly states the declarative/procedural split and points procedures to Trust. This is model layering.
| Sub | Thesis | Placement | Notes |
|-----|--------|-----------|-------|
| 10.1 Data Classification | STRENGTHENS | KEEP | Correctly Core (the validation invariant / high-water mark is Core's characteristic tooth). Strong compliance anchoring. |
| 10.2 Attestation | STRENGTHENS | KEEP | Declarative signature envelope; verification procedure is Trust §1.1.5. Good. |
| 10.3 Authentication | STRENGTHENS | KEEP/→PROTOCOL (done) | 10.3.1/10.3.2 are pointer stubs to Trust — correct. 10.3.3 credential schemes stay in Core as declarations — correct. |
| 10.4 Authorization Scopes | STRENGTHENS | KEEP | Declaration + inheritance in Core, enforcement in Trust §2 — correct. **CC-6** (broken §10.3.2.2 ref) lands here. |
| 10.5 Encryption | NEUTRAL | KEEP | Fine. |

### §11 Runtime Behavior — STRENGTHENS · KEEP declarations
| Sub | Notes |
|-----|-------|
| 11.1 Input / 11.2 Output | NEUTRAL. Description plumbing. Fine. |
| 11.3 Tool Invocation | STRENGTHENS. `max_iterations` / `max_tool_calls_per_session` / `loop_detection` are teeth; enforcement correctly deferred to Runtime §3 with fail-closed default. |
| 11.4 Error Handling | NEUTRAL→STRENGTHENS. Correctly subordinated to §11.5 degradation (`on_tool_error`). The "retained for backward compatibility" note is honest. |
| 11.5 Degradation | STRENGTHENS. The fail-closed default ("Absence … does not mean continue: a conforming governor halts") is the single most thesis-aligned sentence in Core. Keep verbatim. **Gap:** the cause-key pattern `^on_[a-z0-9_]+$` is stated in prose but has **no VAL rule** (VAL-31 only checks the *action* enum, not the *key* shape). Add a VAL rule for the cause-key pattern. |

### §12 Metadata — NEUTRAL · KEEP
Standard. No teeth, no claim of teeth — correct.

### §13 Profiles — NEUTRAL · KEEP
Composition model (`allOf` + `unevaluatedProperties: false`, strictest-wins, dependency rules) is rigorous and correct. §13.3 schema example carries the `0.2` URI drift (**CC-5**). This is the right home for `human_oversight` and `anomaly_baseline` (Governance Profile), which the Runtime Protocol §5/§7 enforce — the Core→Profile→Protocol layering is coherent.

### §14 Processing — STRENGTHENS · KEEP
§14.2 validation table is the conformance backbone. **CC-3** (VAL-29…35 lack error codes) and the §11.5 cause-key VAL gap both land here. Otherwise excellent and testable.

### §15 Interoperability — NEUTRAL · KEEP
A2A/MCP/OpenAPI generation. Appropriately SHOULD-level and informative. Fine.

### §16 Errors — NEUTRAL · KEEP
Good structured-error model. **CC-2** and **CC-3** both land here (mis-mapped ADL-1006; missing codes for new VAL rules). Also: several Security-category codes (ADL-4002 "Invalid signature") describe failures produced by **Trust Protocol** procedures, not Core validation. Add a one-line note that ADL-4xxx codes may be raised by protocol-layer procedures, so the taxonomy's ownership is explicit.

### §17 IANA Considerations — NEUTRAL · KEEP
Thorough (media type, profile registry, URN namespace, well-known URI). Two issues: (a) "ADL compatibility 0.1.x" strings are stale (**CC-5**); (b) for the standardization track, the §17.2 registry and the well-known URI registration should reference the discovery-document **schema artifact** (`schema-discovery.json`) so the registry entry is self-describing.

### §18 Security Considerations — STRENGTHENS · KEEP
Comprehensive and genuinely thesis-aligned: §18.10 (privilege escalation), §18.12 (defense in depth, "runtime monitoring ensures actual behavior remains within boundaries") are the article's argument in normative form. **Opportunity:** §18.12 currently says runtimes "**SHOULD** monitor agent behavior … alerting on anomalous activity" — this is precisely the Runtime Protocol §7 anomaly-baseline mechanism. Add a forward reference from §18.12 to Runtime §7 and §8 (enforcement evidence) so the "would it stop it at 2 a.m." capability is traceable from the security model to the procedure that delivers it.

### §19 References & Appendices A–D — NEUTRAL · KEEP
References are well-formed. **Appendix A** carries the `0.2` schema URI drift (**CC-5**). **Appendix D** ABNF: `adl-urn` production is *referenced* by §17.3 ("defined by the `adl-urn` production in Appendix D") but is **not present** in the Appendix D grammar block — another dangling reference (see AD-1 below). Otherwise the ABNF is clean.

---

## Part 3 — Additional discrete findings

### AD-1 [BLOCKER] `adl-urn` ABNF production referenced but not defined
§17.3 says URN syntax is *"defined by the `adl-urn` production in Appendix D."* Appendix D defines `semver`, `tool-name`, `vendor-key`, `template-var`, `tag`, `pattern` — but **no `adl-urn`**. The Cross-Reference Summary table likewise omits it.
**Action:** Add the `adl-urn` production to Appendix D and a row to the Cross-Reference Summary, or change §17.3 to inline the syntax. (Pairs with CC-1 / CC-2 / CC-6 as the fourth dangling normative reference.)

### AD-2 [MAJOR] Runtime Protocol self-description says "§2–§7" but document has §8
Runtime Protocol intro (line 20): *"the runtime governor is §1 and the enforcement procedures are §2–§7. Section references outside this range … refer to ADL Core."* But §8 (Enforcement Evidence) is in-document and outside §2–§7, so by the document's own rule a "§8" reference would resolve to Core — wrong. The header (line 14) correctly enumerates §8.
**Action:** Change line 20 to "§2–§8" (or "the enforcement procedures are §2–§7 and the enforcement-evidence format is §8; section references outside §1–§8 refer to ADL Core").

### AD-3 [MINOR] Trust Protocol passport-member table vs. "compact" claim
Trust §"The Passport" lists `permissions` and `data_classification` among passport members. `permissions` can be large (host/path/command pattern arrays up to the §18.5 limit of 500/domain). The design model (§1.3) and Trust both stress compactness and "verified on every exchange." Carrying full `permissions` on every exchange is in tension with that.
**Action:** Clarify whether the passport carries full `permissions` or a digest/summary, or note that large-permission agents trade compactness for self-containment. At minimum, acknowledge the trade-off so an implementer sizing a header (`X-ADL-Passport`) is not surprised.

### AD-4 [MINOR] Governance-profile causes referenced from Core degradation enum
§11.5 lists `on_oversight_timeout` ("Governance Profile") and `on_anomaly` among recognized causes, i.e. Core's degradation vocabulary references profile-defined concepts. This is *acceptable* because the cause-key space is open (`^on_[a-z0-9_]+$`), but a reader may read it as Core depending on a profile.
**Action:** Add a half-sentence: "Causes are an open set; profiles MAY define additional causes (e.g., the Governance Profile defines `on_oversight_timeout` and `on_anomaly`)." Keeps the layering honest.

### AD-5 [EDITORIAL] Discovery `status` enum drift risk
`schema-discovery.json` hardcodes `status` enum `["draft","active","deprecated","retired"]`, duplicating §5.6's lifecycle status set. If §5.6 ever gains a status, the discovery schema silently diverges.
**Action:** Note in §6.4 that discovery `status` mirrors §5.6 and the two enums MUST be kept in lockstep (or, longer term, generate one from the other).

---

## Part 4 — Forward-looking recommendations (thesis alignment)

These are not defects; they are opportunities to make Core *read* like the operating-system thesis rather than only the constitution.

### FR-1 Add an enforcement/accountability bullet to §1.1 Purpose
The five "enables" bullets stop at "Security" and "Lifecycle." Add a sixth that names the new center of gravity:
> **Accountability:** Declared limits carry runtime force — a runtime governor enforces budgets, iteration, sub-agent admission, oversight, and degradation, and can produce verifiable evidence that it did (see the Runtime Protocol).

This is the single edit that most aligns Core's *framing* with the article. Pairs with CC-8.

### FR-2 A "Governance Model" note box in §1.3 or §9 preamble
One short paragraph stating the article's frame in spec voice: *Core is the constitution (what an agent is and the limits it declares); the protocol layer is the operating system (what actors must do to give those limits force at admission and at runtime).* It gives every downstream reader the mental model the protocols assume.

### FR-3 Promote `requires_confirmation` into the Runtime oversight procedure
`tools[*].requires_confirmation` (§8.1) is a real, always-on, per-tool human-in-the-loop gate, but it is only enforced via §18.12 prose. Reference it from Runtime Protocol §5 (Oversight Triggers) so the governor has a defined procedure for it, parallel to the structured `human_oversight.triggers`. This turns a static SHOULD into governed teeth.

### FR-4 IPR / "Note Well" handling for the standardization track
Core's header carries "Patent Pending (US Provisional …)." For IETF submission this needs an IPR disclosure per BCP 79, and ISO has its own patent policy; an inline "Patent Pending" line in the spec body is unusual for a standards-track draft.
**Action:** Before any standards-body submission, move IPR/patent disclosure to the conventional location (Note Well / IPR statement / boilerplate) and out of the title block. (Track-prep item, not a draft-correctness item.)

---

## Part 5 — Prioritized action list

**Fix before next milestone (Blockers + cross-doc majors):**
1. CC-1 — remove/rehome the dangling `autonomy` member (§3).
2. CC-2 — fix the `ADL-1006` mis-map (§7.2 / §16.2).
3. AD-1 — add the missing `adl-urn` ABNF production (Appendix D / §17.3).
4. CC-6 — fix `§10.3.2.2` → Trust §1.2.2 (§10.4); sweep sibling deep refs.
5. CC-3 — add error codes for VAL-29…VAL-35 (§16.2).
6. CC-4 — make `adl_discovery` required in §6.4 prose to match schema.
7. AD-2 — fix Runtime Protocol "§2–§7" self-description to include §8.

**High-value consistency + framing:**
8. CC-5 — resolve version drift policy (0.2/0.1.x → current line; explain example-pinning).
9. CC-7 — add passport / counterparty / runtime governor to §3 Terminology.
10. CC-8 + FR-1 — fix "enforceable" overclaim and add the accountability bullet.
11. §11.5 cause-key VAL rule; AD-4 open-cause note.

**Editorial polish:**
12. CC-9 — normalize "ADL document" capitalization across protocols.
13. CC-10 — reword the nine "May contain:" lead-ins.
14. AD-3, AD-5, §9.6 resource-limit enforcement-scope note, FR-2/FR-3/FR-4.

---

## Overall assessment

The architecture is sound and, since the runtime-governance work, genuinely thesis-aligned: the declaration/enforcement split (Core vs. protocol layer), deny-by-default permissions, the §11.5 fail-closed default, and the Runtime Protocol's governor/PDP/PEP model are exactly the "operating system, not constitution alone" posture the article argues for. The spec does *not* over-promise enforcement in most places — §9.6, §9.7, §11.3, §11.5 each correctly say "these are declarations; the procedure is in the Runtime Protocol."

The defects are concentrated and fixable: **four dangling normative references** (CC-1, CC-2, CC-6, AD-1), **one validation/error-code gap** (CC-3), and **version drift** (CC-5). None are architectural. The single framing fix worth making deliberately is CC-8/FR-1 — Core's *opening* still describes itself as a 2024-era description format ("enforceable" security, no accountability story), while the *body* has moved to the runtime-teeth model. Aligning the introduction with what the document now is would make the thesis legible from the first page.
