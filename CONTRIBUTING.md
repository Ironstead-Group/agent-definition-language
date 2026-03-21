# Contributing to the Agent Definition Language (ADL)

Thank you for your interest in contributing to the Agent Definition Language specification and its standardization. This document explains how to participate.

## Code of Conduct

By participating, you agree to uphold our [Code of Conduct](CODE_OF_CONDUCT.md).

## Contributor License Agreement (CLA)

All contributors must sign the [Contributor License Agreement](CLA.md) before any contribution can be accepted. The CLA grants the project a copyright and patent license on your contributions, ensuring the ADL specification and all conforming implementations remain freely available.

**How it works:**

1. Open a pull request.
2. A CI check will verify whether you have signed the CLA.
3. If you haven't signed, the bot will post instructions on your PR.
4. Sign by commenting: `I have read the CLA Document and I hereby sign the CLA`
5. The check passes automatically and your signature is recorded for all future contributions.

You only need to sign once.

## Local Development

After cloning and installing:

```bash
bun install                # install deps + auto-configure git hooks (via lefthook)
```

### Available scripts

| Command | What it does |
|---------|-------------|
| `bun run build` | Build packages in dependency order (core → generator → cli) |
| `bun run typecheck` | Typecheck all packages |
| `bun run test` | Test all packages |
| `bun run check` | Full CI-equivalent check (build + typecheck + test) |

### Git hooks

Git hooks are installed automatically by `bun install`. They run via [lefthook](https://github.com/evilmartians/lefthook):

- **Pre-commit**: builds and typechecks all packages (only when `packages/` files change)
- **Pre-push**: runs the full check suite (build + typecheck + test)

Use `--no-verify` to skip hooks for work-in-progress commits.

## How to Contribute

### Fork and pull request (required)

All contributions must come through a **fork-and-pull-request** workflow. Direct pushes to the repository are not permitted.

1. **Fork** this repository to your own GitHub account.
2. **Clone** your fork locally.
3. **Create a branch** from `main` using a conventional prefix (`feature/`, `fix/`, `docs/`).
4. **Implement** your change following the repository structure and conventions below.
5. **Commit** using [Conventional Commits](https://www.conventionalcommits.org/) (e.g., `docs(spec): add Identity object`, `feat(spec): define Tools object`).
6. **Push** to your fork and open a pull request against `main` in this repository.
7. **Sign the CLA** if prompted by the CI check.

### Review and approval

All pull requests require approval from the project maintainer before merging. The maintainer reviews for:

- Spec correctness and consistency
- Alignment with the standardization roadmap
- Conformance to conventions and repository structure
- CLA signature

Do not expect immediate merges — review may involve discussion and iteration.

### Reporting issues

- **Specification:** Use the [Spec change](.github/ISSUE_TEMPLATE/spec_change.md) template for bugs, clarifications, or proposed changes to the spec.
- **Standardization:** Use the [Standardization](.github/ISSUE_TEMPLATE/standardization.md) template for work related to standards bodies (Linux Foundation, IETF, ISO, etc.).
- **General:** Open a regular issue or discussion for questions, ideas, or process feedback.

### Proposal documents

For larger or normative changes, add a proposal under [proposals/](proposals/) (see [proposals/README.md](proposals/README.md)) and reference it in the issue or PR.

## Repository structure

| Path | Purpose |
|------|---------|
| `versions/` | Versioned specification (e.g., `0.2.0/spec.md`). |
| `packages/` | SDK, CLI, code generator, and agent tooling. |
| `profiles/` | Domain-specific profiles. |
| `standardization/` | Roadmap and per-standards-body notes (LF, IETF, ISO). |
| `proposals/` | Spec and process proposals. |
| `examples/` | Example ADL documents. |
| `site/` | Documentation site ([adl-spec.org](https://adl-spec.org)). |
| `.github/` | CI workflows, issue and PR templates. |

## Governance

Decision-making and maintainer roles are described in [GOVERNANCE.md](GOVERNANCE.md).

## Intellectual Property

- The specification is licensed under the [Apache License 2.0](LICENSE).
- A [Patent Non-Assertion Covenant](PATENTS) covers all conforming implementations.
- By submitting a pull request and signing the [CLA](CLA.md), you grant the project copyright and patent licenses on your contributions as described in the CLA.
