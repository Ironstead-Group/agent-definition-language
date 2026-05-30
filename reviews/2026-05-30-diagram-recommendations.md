# ADL Diagram Recommendations — Standards & Patent Lenses

**Date:** 2026-05-30
**Companion to:** `2026-05-30-spec-editorial-review.md`
**Scope:** Where diagrams would strengthen the ADL Core spec and the two protocols, evaluated for **two distinct audiences** with **two distinct render targets**.

---

## Stance correction: not everything about an agent can be "drawn once"

An earlier draft of this document reached reflexively for UML across the board — including the **sequence diagram**. That ran straight into the stance of *Governance is Changing Meaning in AI*, which is exactly that the traditional design-time picture no longer fits an agent. As the article puts it (quotations as rendered from the published piece — confirm exact wording against your source):

> "You can't capture an agent in a C4 diagram, because the interesting part — which tools, in what order, with what data — isn't in the boxes and arrows."
> "A document describing what the system is supposed to do no longer describes what it actually does."
> "The execution path is the central object for runtime governance."

The correction is a distinction the article supports: **separate the deterministic machinery *around* the agent from the emergent behavior *of* the agent.**

| | **Regime A — deterministic machinery** | **Regime B — the agent and its behavior** |
|---|---|---|
| **What it is** | The fixed, engineered infrastructure: passport verification, the governor's decision logic, crypto/authz, the evidence record's structure | What the agent *does*: which tools it calls, in what order, how it reasons, when it loops or escalates |
| **Can you "draw it once and trust it"?** | **Yes.** This code is deterministic — same inputs, same decision. It is the guardrail, not the thing being guarded. | **No.** Emergent, probabilistic, per-run — the execution path is the object, and it changes run to run. |
| **Right representation** | Conventional diagrams are legitimate: component (apparatus), activity/flowchart (procedures), data-structure (records). Sequence **only** for a deterministic protocol exchange, labeled as such. | **Not** architecture / data-flow / sequence-as-design. Use behavior-space representations: declared **envelopes** with **trajectories** that may strain or breach them; representative **runtime traces** (one run, explicitly "what happened," not "the design"); role/mandate framings; observability views. |
| **The trap** | (few — this is ordinary software) | Drawing one flow and implying it *is* the agent. A box-and-line "agent architecture" lies the moment the agent takes a different path. |

The governance thesis tells you how to draw Regime B: you cannot draw the one path, so you draw the **boundary** (the declared limits) and show behavior being **policed against it at runtime** — a guardrail plus a cloud of possible trajectories, not a pipeline.

A blunt test for every proposed figure: **if a second run of the same agent would make the drawing wrong, it is a Regime-B subject and must not be drawn as fixed architecture.** A passport-verification flowchart passes (it runs the same every time). An "agent does X then Y then Z" sequence fails (the next run does X then W).

The two render targets below (clean SVG for the site; formal B/W line art with reference numerals for the patent) apply **only to Regime-A figures**. Regime-B subjects use the rethought vocabulary in "Elaborating agents like actors, not architectures."

---

## Framing: two render targets (for Regime-A figures only)

For the deterministic machinery — and only that — a standards figure and a patent figure are close cousins, and **UML is the right, expected form**: IETF/ISO normative procedures and patent apparatus/method figures are conventionally drawn this way.

| | Standards-body figure | Patent figure |
|---|---|---|
| **Goal** | Orient the reader; make a normative procedure scannable | Provide written-description support for the apparatus and method claims |
| **Form** | UML — component/block (architecture), activity (procedures), sequence (interactions), state machine (lifecycle) | Same UML forms, rendered as formal drawings |
| **Style** | Clean UML, color OK, version-pinned SVG (per `diagrams/README.md`) | Formal B/W line art, numbered `FIG. N`, **reference numerals** (100, 110, 120…), no shading/color, USPTO drawing rules |
| **Content bias** | Architecture + the procedure | Architecture (apparatus, component diagrams) **and** step-by-step method flowcharts/activity diagrams (one per independent claim) |
| **Lives in** | `versions/draft/diagrams/` + `protocol/draft/` | The patent application's drawings section |

**Practical consequence:** design each concept **once** as UML, then derive two renders. A clean color UML SVG is the source of truth for the site; a formal line-art version (reference-numeraled, B/W) is produced for the filing. The two render targets share the same UML structure, so this is a styling pass, not a redraw. UML method flowcharts map directly to patent method-claim figures, and UML component diagrams map to apparatus figures — which is why UML serves both audiences with one logical drawing.

**Timing note (patent):** the provisional (US 63/985,186) was filed 2026-02-18, so the **non-provisional conversion deadline is ~2027-02-18**. Provisionals don't strictly require formal drawings, but the non-provisional does, and figures added now give written-description support for what gets claimed. Building the conceptual set during the draft cycle de-risks the conversion.

**Existing asset:** `multi-hop-authorization` (Excalidraw + SVG + PNG) already exists in both `versions/draft/diagrams/` and `patterns/draft/diagrams/`. It covers Trust §2.3. The infographic is kept; a **UML sequence diagram** was added alongside it — but it is correctly a **Regime-A** figure: it depicts the deterministic *authorization mechanics across one hop* (the §2.1/§2.2 subset checks, which run identically every time), not the agent's emergent choice of which counterparties to call. It must be captioned as **one representative trace** — other runs discover different counterparties in different orders (the pattern doc already says discovery is emergent, not pre-planned).

## Per-figure regime & representation

The **Regime** column applies the test above. Regime-A figures use UML. Regime-B figures must **not** be drawn as fixed architecture/sequence; they use the behavior-space vocabulary from "Elaborating agents like actors, not architectures."

| ID | Figure | Regime | Representation |
|----|--------|--------|----------------|
| D1 | Document family / layer architecture | **A** | Component diagram (Core / Trust / Runtime + open-layer slot) — the spec family is fixed |
| D2 | Passport distillation | **A** | Class/object diagram — `Passport` as a deterministic projection of `ADLDocument` |
| D3 | Runtime governor over the agent | **B + A** | **Behavior-envelope** (declared limits as a boundary; emergent agent trajectories straining/breaching it; governor enforcing at the edge). The governor's *decision logic* is an A inset (activity diagram); the agent's behavior is **not** a flowchart |
| D4 | Enforcement evidence record | **A** | Class diagram (Record / Event / Signature hash-chain) + activity diagram for §8.6 verification. *Content* is a behavioral account (Regime B — see below), but the **structure and verification** are deterministic |
| D5 | Passport verification pipeline | **A** | Activity diagram — gated §1.1.1–§1.1.10 steps. Runs identically every time |
| D6 | Presentation proof replay binding | **A** | Sequence diagram of the deterministic crypto exchange (presenter → verifier; replay rejected) |
| D7 | Anti-swap / version-pinning | **A** | State machine (admitted → governing → fault → fail-closed) — session-integrity logic is deterministic |
| D8 | Degradation / fail-closed default | **A** | Activity diagram (declared? → apply : halt) — governor logic is deterministic |
| D9 | End-to-end "what an agent does" lifecycle | **B** | **Not** a sequence diagram. A representative **trace** (labeled "one run") and/or a **journey/scenario narrative**; the structural spine (describe → distill → admit → govern → evidence) can be an A component view, but the agent's *work* between those points is Regime B |
| D10 | Conformance tiers R1/R2/R3 | **A** | Ladder/table (not agent behavior at all) |
| D11 | Data classification high-water mark | **A** | Object diagram (sensitivities roll up to the max) — deterministic validation |
| D12 | Discovery & triage | **A + B** | The retrieve/verify exchange is A (sequence OK). The *"which agents are worth engaging"* judgment is B — show the candidate set and selection criteria, not a fixed decision path |
| D13 | Permission deny-by-default resolution | **A** | Activity diagram (allow/deny → deny-takes-precedence) — deterministic |
| — | Multi-hop authorization (exists) | **A** (representative trace) | Sequence diagram of the per-hop authorization mechanics, captioned as one representative run |

The pattern is clear: **the guardrails, the verifier, the governor's logic, and the records are Regime A** (draw them conventionally — they are the "operating system" the article wants, and operating systems *are* deterministic). **The agent's conduct is Regime B** (draw the envelope and the trajectories, never the one pipeline).

---

## Elaborating agents like actors, not architectures

The deeper point — agents behave more like **people** than like programs — changes how we should elaborate the *concepts*, not only how we draw them. We have a century of practice describing non-deterministic actors who exercise judgment within bounds: we don't draw an employee's flowchart, we write their **role, mandate, and code of conduct**, and we **review what they did**. ADL already leans on this instinct (it calls the credential a *passport*). The recommendation is to make that instinct the explicit representational vocabulary for every Regime-B concept.

Four human-actor framings, each with the agent-governance concept it elaborates and how to render it:

1. **Role & mandate (the job description), not the component box.**
   *Elaborates:* identity, capabilities, permitted autonomy, scope ceiling.
   *Render:* a "credential / role card" — who this actor is, what it is trusted to do, the ceiling of its authority. This is the **passport**, drawn as an identity document, not a module in an architecture. A reader should read it like a badge, not a UML class.

2. **Code of conduct & guardrails (the policy), not the control-flow graph.**
   *Elaborates:* declared limits — budgets, iteration caps, sub-agent rules, oversight triggers, degradation.
   *Render:* the **behavior-envelope** (Regime B above). You state the rules and the boundary; you accept the actor will exercise judgment inside them. You never claim to predict the path.

3. **The account of what was done (the audit / performance record), not the data-flow map.**
   *Elaborates:* enforcement evidence (§8), audit trails.
   *Render:* a **logbook / black-box record** — a chronological account of actual conduct against the mandate. This is the article's "what an agent actually did at 2 a.m." It is inherently per-run (Regime B in content), even though its *format* is a Regime-A data structure. Drawing it as a timeline of observed events is honest; drawing it as a designed flow is not.

4. **Case narratives & delegation relationships (how a person would handle it / the org chart), not the sequence diagram-as-design.**
   *Elaborates:* multi-hop delegation, agent-to-agent trust, worked scenarios.
   *Render:* **representative scenario traces** (explicitly "one run") and **trust/delegation relationship maps** (who is acting on whose behalf — an org chart of authority, which is a human structure). The vacation-booking pattern doc is exactly this done well: a narrative of one run, not a claim about all runs.

A consolidated way to hold it: **describe an agent the way an organization describes a trusted employee** — credentials, mandate, conduct rules, and an accountability record — and reserve engineering diagrams for the *systems that admit, govern, and audit* that employee. The agent gets a role and a review; the guardrails get a blueprint.

**Implication for the spec, beyond diagrams:** the same lens applies to prose. Sections that describe *machinery* (verification, enforcement procedure) read correctly as engineering. Sections that describe the *agent* should be checked for language that implies fixed, predictable behavior — "the agent then does X" — where "the agent is **authorized** to X, within Y" is the truthful framing. This is the prose form of the same correction, and it reinforces the editorial review's CC-8 point (Core overclaiming "enforceable" — the agent is *governed*, not *determined*).

---

---

## Priority 1 — Build these (highest joint value)

These carry the novelty *and* the reader-orientation load. Each is both a standards figure and a patent figure.

### D1. The document family / layer architecture — "Core declares; the protocols enforce"
- **Shows:** Three layers — ADL Core (declarative passport source) → Trust Protocol (admission-time counterparty procedures) → Runtime Protocol (continuous governor procedures) — with the open-layer slot for future protocols. The "declare vs. enforce" boundary drawn explicitly.
- **Anchors:** Core §1.3; `protocol/draft/index.md`.
- **Standards value:** Very high. This is the orientation figure the whole family currently lacks. A reader landing on any one document can't presently see the shape of the three.
- **Patent value:** High — strong candidate for **FIG. 1 (system overview / apparatus)**. Reference-numeral the passport, the counterparty, the governor, the evidence record.
- **UML treatment:** Component diagram — Core, Trust, Runtime as components with provided/required interfaces across the declare↔enforce boundary; the open-layer slot as an extension point.

### D2. Passport distillation — full ADL document → passport → presentation
- **Shows:** The full ADL document (all member groups) on the left; the **subset** of members distilled into the passport (the Trust §"The Passport" table) in the middle; the passport traveling on an exchange (attached or dereferenced) on the right. Visually answers "what's in vs. out, and why it's compact."
- **Anchors:** Core §1.3; Trust §"The Passport".
- **Standards value:** High. The passport/document distinction was a recurring point of confusion; a class/object diagram showing the passport as a typed projection of the document settles it instantly.
- **Patent value:** High — the **distillation step** (deriving a compact, separately-verifiable credential from the full description, with the declaration/operations split) is plausibly a distinctive method. Worth an apparatus + method pair.
- **UML treatment:** Class/object diagram — `ADLDocument` with its member groups, `Passport` as a projected subset, a «derive» dependency between them, and a «present» association to the counterparty.

### D3. The Runtime Governor — observe → decide → enforce (PDP/PEP), with actor placement
- **Shows:** The governor as a logical role wrapping the runtime; the PDP (evaluates declared limits vs. observed session state) and PEP (observe / throttle / pause / halt / escalate) loop; the explicit distinction governor ≠ runtime ≠ counterparty. Fail-closed default surfaced.
- **Anchors:** Runtime §1.1–§1.2.
- **Standards value:** Very high. The governor is the single most important *new* concept and is currently all prose.
- **Patent value:** Very high — this is likely **the core apparatus figure** (the governing system with PDP/PEP decision/enforcement points). The "2 a.m. rogue agent — stop it, not just document it" thesis lives here.
- **Treatment (Regime B + A):** This is the figure where the stance matters most. Do **not** draw the agent as a component box with a tidy internal flow — that is the C4/sequence trap the article names. Draw a **behavior-envelope**: the declared limits as a boundary, the agent's behavior as a **fan of possible trajectories** inside it (some straining toward the edge, one breaching), and the governor as the deterministic authority **on the boundary** that throttles/halts the breach. The governor's own decision logic (PDP/PEP) *is* deterministic and can sit as a small **activity-diagram inset** — that part is Regime A. The whole point: the guardrail is fixed and drawable; the conduct it polices is not.

### D4. Enforcement evidence — the hash-chained record (§8)
- **Shows:** Record header → ordered, hash-chained events (each `prev_hash` linking to the prior) → governor signature sealing the chain → optional counterparty nonce binding. A callout box: **proves** tamper-evidence + freshness; **does not prove** completeness (the reserved witness tier).
- **Anchors:** Runtime §8.1–§8.8; `schema-enforcement-record.json`.
- **Standards value:** High. The "what it proves vs. what it doesn't" honesty is hard to hold in prose and easy in a diagram.
- **Patent value:** High — a **data-structure figure** plus a **verification-method flowchart** (§8.6 steps). The hash-chain + passport-digest binding + nonce freshness is a concrete, claimable mechanism.
- **UML treatment:** Class diagram for the record structure (Record → Event[] hash-chain → Signature) plus a sequence diagram for the §8.6 counterparty-verification interaction; a note compartment captures proves vs. does-not-prove.

---

## Priority 2 — Strong standards value; selective patent value

### D5. Passport verification pipeline — the gated steps (§1.1.1–§1.1.10)
- **Shows:** The layered, each-gate-gates-the-next verification flow: retrieval integrity → schema → identity resolution → key cross-check → signature → temporal → lifecycle → provider coherence → permission/classification → outcome. Branch points (URN-only ⇒ TOFU; deprecated ⇒ warn).
- **Anchors:** Trust §1.1.
- **Standards value:** Very high — a ten-step gated procedure is exactly what a figure makes scannable.
- **Patent value:** Moderate — a **method flowchart** candidate, but verification pipelines are well-trodden prior art; claim only the ADL-specific gates if at all.
- **UML treatment:** Activity diagram — each gate a step, with decision nodes for the branches (URN-only ⇒ TOFU; deprecated ⇒ warn; any gate fail ⇒ reject). Maps directly to a patent method-claim flowchart.

### D6. Presentation proof — replay binding (§1.2)
- **Shows:** A scraped/replayed passport is rejected because the per-request proof binds passport → request URI + method + timestamp + `jti`, signed by the private key the attacker lacks. The threat (left) vs. the bound request (right).
- **Anchors:** Trust §1.2.1–§1.2.6.
- **Standards value:** High — the threat model becomes obvious.
- **Patent value:** Moderate–High as a **method figure**, though conceptually adjacent to DPoP (RFC 9449) which the spec itself cites; novelty would be in the ADL-native binding, so frame carefully.

### D7. Anti-swap / version-pinning session binding (§1.3)
- **Shows:** Passport admitted at session start is pinned (canonical bytes); any mid-session mutation (different/re-signed passport, altered §2–§7 members) → session-integrity fault → fail-closed degradation.
- **Anchors:** Runtime §1.3.
- **Standards value:** Moderate–High.
- **Patent value:** High — the "limits are fixed at admission and cannot be silently swapped mid-session" is a distinctive, claimable method. Good **method-flowchart** candidate.

### D8. Degradation decision & the fail-closed default (§6 / Core §11.5)
- **Shows:** Cause fires → look up `runtime.degradation[cause]` → if declared, apply (halt/pause/fallback/continue) → **if absent, HALT (fail-closed)**, with `continue` flagged as explicit fail-open that must be recorded.
- **Anchors:** Runtime §6; Core §11.5.
- **Standards value:** High — the fail-closed default is the thesis sentence; a figure burns it in.
- **Patent value:** Moderate — method step within the governor; likely folded into D3's method claim rather than standalone.

---

## Priority 3 — Nice-to-have (standards readability; low patent value)

| ID | Diagram | Anchor | Why | Patent |
|----|---------|--------|-----|--------|
| D9 | End-to-end lifecycle ribbon: describe → distill → publish/discover → admit (Trust) → govern (Runtime) → evidence | family-wide | The single "big picture" for a landing page; complements D1 | Low (covered by D1) |
| D10 | Conformance tiers R1/R2/R3 ladder | Runtime "Conformance Tiers" | Cumulative-capability ladder reads better as a figure than a table | Low |
| D11 | Data classification high-water mark roll-up | Core §10.1 | Tool/resource sensitivities roll up to top-level max | Low (known FIPS 199 principle — likely unpatentable) |
| D12 | Discovery triage flow: domain publishes `.well-known/adl-agents` → agent triages by `description`/`keywords` → fetches full doc → verifies | Core §6.4 | Shows "publishing = inviting connection" and the triage-before-fetch economy | Low–Moderate |
| D13 | Deny-by-default + deny-takes-precedence permission resolution | Core §9.1 | Clarifies conflict resolution | Low (known model) |

---

## Recommended figure set for the patent (consolidated view)

If the goal is the non-provisional drawings, the minimum compelling set is:

1. **FIG. 1** — System overview / apparatus (**D1**): Core + Trust + Runtime, passport, counterparty, governor, evidence record — all reference-numeraled.
2. **FIG. 2** — Passport distillation apparatus + method (**D2**).
3. **FIG. 3** — Runtime governor apparatus, PDP/PEP control loop (**D3**).
4. **FIG. 4** — Governor enforcement method flowchart: observe→decide→enforce with fail-closed default (**D3 + D8**).
5. **FIG. 5** — Anti-swap / version-pinned session-binding method (**D7**).
6. **FIG. 6** — Enforcement-record data structure + verification method (**D4**).
7. **FIG. 7** — Multi-hop authorization (**existing** `multi-hop-authorization`, redrawn as line art).
8. *(Optional)* **FIG. 8** — Presentation-proof replay-binding method (**D6**), if claimed.

These map to the likely claim structure: **apparatus claims** (FIG 1–3, 6) + **method claims** (FIG 4–7). Have patent counsel confirm which mechanisms are claimed before investing in formal renders — draw the conceptual versions first (cheap, reusable for the site), formalize only what's claimed.

**Note on the stance:** every patent figure above is deliberately **Regime A** — the deterministic machinery (governor apparatus, enforcement method, evidence structure, authorization mechanics). That is correct: you patent the *invention* (the governing system and its methods), which is fixed and drawable — not the agent's emergent conduct. For FIG. 3, draw the governor **apparatus** (PDP/PEP, version-pin, fail-closed) as a deterministic block diagram, **not** the behavior-envelope. The behavior-envelope (D3's Regime-B render) is a standards/explanatory figure for human readers, not a claim figure; the agent's non-determinism belongs in the specification's **background/problem statement**, not as a claimed element.

---

## Suggested sequencing

1. **D1, D2, D3** first — they carry both the standards-orientation gap and the core patent apparatus, and unblock the site's missing "big picture."
2. **D4, D7** next — the two most distinctive claimable methods (evidence chain, anti-swap).
3. **D5, D6, D8** as the protocols firm up.
4. Priority 3 as polish.

All site renders follow `versions/draft/diagrams/README.md`: editable master + white-background SVG, relative-path embed, version-pinned. (The README's Excalidraw workflow is for infographics; for UML, use a UML tool that emits clean SVG — e.g. PlantUML/Mermaid or a UML editor — and keep the editable source alongside the SVG the same way.) The protocol docs (`protocol/draft/*.md`, CommonMark) use the plain `![alt](../diagrams/<name>.svg)` form; `.mdx` can use the `<Diagram>` card.

---

## One caution

Diagrams in a **normative** standards document must not introduce requirements that aren't in the text, and must not contradict it. Keep every figure **illustrative** (the prose remains authoritative), label them "Figure N (informative)," and make sure a figure never becomes the only place a `MUST` is stated. For the patent, the opposite discipline applies — the figures should depict every element the claims recite, so the apparatus/method is fully supported by the drawings. Same concept, two disciplines; another reason to keep the two render targets separate.
