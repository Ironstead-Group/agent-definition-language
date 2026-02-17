---
description: Approve a proposal and spawn a team to implement and verify it against the proposal
allowed-tools: Read, Glob, Grep, Task, TeamCreate, TaskCreate, TaskUpdate, TaskList, TaskGet, SendMessage, TeamDelete
---

Approve a proposal and spawn a coordinated team to implement all changes described in it, then verify the implementation is complete and correct.

## Usage

```
/implement-proposal proposals/2026-02-16-critical-gap-remediation.md
```

If no path is given, find the most recently modified `.md` in `proposals/` (excluding `README.md`).

## Step 1: Parse the Proposal

Read the proposal file. Extract the **Affects** metadata (e.g., `Affects: versions/0.1.0/spec.md, versions/0.1.0/schema.json`).

**If the proposal has no `Affects` line listing target files, STOP and report an error to the user.** Every proposal must declare which files it modifies. Do not guess.

Parse the `Affects` paths to determine which files will be modified. Read each affected file so you understand the current state.

## Step 2: Create the Team

Create a team called `proposal-impl` with 4 agents:

| Agent | Type | Role | Model |
|-------|------|------|-------|
| spec-writer | `general-purpose` | Implement spec and manifest changes | `opus` |
| schema-writer | `general-purpose` | Implement schema changes | `opus` |
| proposal-verifier | `general-purpose` | Verify every proposal item was implemented | `opus` |
| spec-reviewer | `general-purpose` | Check convention compliance | `sonnet` |

## Step 3: Create Tasks

Create these tasks:

1. **"Implement spec and manifest changes from proposal"** — owner: spec-writer
2. **"Implement schema changes from proposal"** — owner: schema-writer, blocked by task 1
3. **"Verify implementation completeness against proposal"** — owner: proposal-verifier, blocked by tasks 1 and 2
4. **"Review spec convention compliance"** — owner: spec-reviewer, blocked by tasks 1 and 2

## Step 4: Spawn Agents

### spec-writer

```
You are spec-writer on the proposal-impl team. Your job is to implement spec and manifest changes from an approved proposal.

PROPOSAL: Read the proposal at {proposal_path}
AFFECTED FILES: {affected_files extracted from Affects metadata}
CONVENTIONS: Read AGENTS.md for authoring conventions

Read your task with TaskGet, mark it in_progress, then:

1. Read the proposal thoroughly — extract every change to spec files and manifest files
2. Read the current state of each affected spec/manifest file
3. Implement ALL changes described in the proposal's Details section:
   - Normative text additions and modifications
   - Member definition tables
   - Section numbering fixes (new sections, renumbered sections)
   - Validation rule additions
   - Error code additions
   - Any other spec text changes
4. For manifest files: update section entries to match spec changes
5. Follow ADL authoring conventions strictly:
   - Section headings: ## N. Title (top-level), ### N.M Title (subsections)
   - RFC 2119 keywords (MUST, SHOULD, MAY, etc.) in **bold**
   - Markdown pipe tables for member definitions
   - Fenced code blocks with language tags
   - Cross-references as "Section N" or "Appendix A"

Do NOT modify schema files — that is handled by schema-writer.
When done, mark your task completed and send a summary to team-lead listing every change made.
```

### schema-writer

```
You are schema-writer on the proposal-impl team. Your job is to implement schema changes from an approved proposal.

PROPOSAL: Read the proposal at {proposal_path}
AFFECTED FILES: {affected schema files from Affects metadata}
DEPENDENCY: Wait for spec-writer to complete (task 1) before starting — structures must be defined in spec first.

Read your task with TaskGet. Wait until it is unblocked, then mark it in_progress.

1. Read the proposal thoroughly — extract every schema change (property definitions, additionalProperties fixes, patternProperties additions)
2. Read the current schema file(s)
3. Read the updated spec file(s) to confirm structures are now defined
4. Implement ALL schema changes described in the proposal:
   - Add all property definitions from the proposal's schema fragments
   - Apply patternProperties/additionalProperties changes to every object
   - Ensure the assembled schema is valid JSON Schema Draft 2020-12
5. After editing, verify the result is valid JSON (use a JSON parse check)
6. Verify existing examples still validate against the new schema (or note which ones need updates)

When done, mark your task completed and send a summary to team-lead listing every change made.
```

### proposal-verifier

```
You are proposal-verifier on the proposal-impl team. Your job is to ensure the implementation is COMPLETE — every discrete change in the proposal was implemented.

PROPOSAL: Read the proposal at {proposal_path}
AFFECTED FILES: {affected_files from Affects metadata}
DEPENDENCY: Wait for both spec-writer and schema-writer to complete before starting.

Read your task with TaskGet. Wait until it is unblocked, then mark it in_progress.

1. Read the FULL proposal document
2. Read ALL affected files in their current (post-implementation) state
3. Create a checklist of EVERY discrete change described in the proposal
4. For each item, verify:
   - Was it implemented? (YES/NO)
   - Is it correct — does it match what the proposal specified? (CORRECT/INCORRECT/PARTIAL)
   - If incorrect or missing, what specifically is wrong?

Your checklist MUST cover:
- Every schema property/fragment the proposal defines
- Every normative text change (new paragraphs, modified sentences)
- Every member definition table
- Every section numbering fix
- Every manifest update
- Every validation rule addition
- Every error code addition
- Every patternProperties/additionalProperties change
- Every cross-reference update

Send a detailed PASS/FAIL report to team-lead. Format:

## Verification Report
- Total items: N
- Passed: N
- Failed: N
- Partial: N

### Passed Items
- [PASS] Description...

### Failed/Partial Items
- [FAIL] Description... — What's missing/wrong: ...
- [PARTIAL] Description... — What's incomplete: ...
```

### spec-reviewer

```
You are spec-reviewer on the proposal-impl team. Your job is to check that the modified spec follows ADL authoring conventions.

AFFECTED FILES: {affected spec/manifest files from Affects metadata}
CONVENTIONS: Read AGENTS.md for authoring conventions.
DEPENDENCY: Wait for both spec-writer and schema-writer to complete before starting.

Read your task with TaskGet. Wait until it is unblocked, then mark it in_progress.

1. Read AGENTS.md for spec authoring conventions
2. Read the modified spec and manifest files
3. Check:
   a. Section numbering in spec matches spec-manifest.yaml exactly (every section, every subsection)
   b. All RFC 2119 keywords (MUST, MUST NOT, REQUIRED, SHALL, SHALL NOT, SHOULD, SHOULD NOT, RECOMMENDED, NOT RECOMMENDED, MAY, OPTIONAL) are in **bold**
   c. All member definition tables use proper Markdown pipe table format with consistent columns
   d. All code blocks have language tags (```json, ```yaml, etc.)
   e. Cross-references ("Section N", "Appendix A") point to sections that actually exist
   f. All member names and field names use snake_case
   g. Schema file defines properties for members described in spec (spot-check, not exhaustive)
   h. No orphaned cross-references or dangling section numbers

Flag issues as:
- CRITICAL: Broken cross-references, manifest out of sync, missing RFC 2119 bolding on normative requirements
- HIGH: Malformed tables, missing language tags on code blocks
- LOW: Style inconsistencies, minor formatting

Send your findings to team-lead.
```

## Step 5: Monitor and Synthesize

As team lead:
1. Monitor task completion via TaskList
2. When implementation agents finish, verification agents automatically unblock
3. When all agents report, synthesize:
   - Implementation summary (what changed)
   - Proposal-verifier results (completeness check)
   - Spec-reviewer results (convention compliance)
4. Report to the user:
   - If all verifier items PASS and no CRITICAL reviewer issues: **Implementation complete**
   - If there are gaps: list them so the user can decide to fix or accept
5. Shut down the team and clean up

## When to Use This

- After a proposal has been reviewed and approved
- When you want automated implementation with built-in verification
- When you want to ensure nothing from the proposal gets missed during implementation
