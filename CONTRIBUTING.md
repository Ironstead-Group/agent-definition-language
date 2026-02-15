# Contributing to the Agent Definition Language (ADL)

Thank you for your interest in contributing to the Agent Definition Language specification and its standardization. This document explains how to participate.

## Code of Conduct

By participating, you agree to uphold our [Code of Conduct](CODE_OF_CONDUCT.md).

## How to Contribute

### Reporting issues

- **Specification:** Use the [Spec change](.github/ISSUE_TEMPLATE/spec_change.md) template for bugs, clarifications, or proposed changes to the spec.
- **Standardization:** Use the [Standardization](.github/ISSUE_TEMPLATE/standardization.md) template for work related to standards bodies (Linux Foundation, IETF, ISO, etc.).
- **General:** Open a regular issue or discussion for questions, ideas, or process feedback.

### Proposing changes

1. **Check existing work** — Search [issues](https://github.com/YOUR_ORG/agent-definition-language/issues) and [discussions](https://github.com/YOUR_ORG/agent-definition-language/discussions) to avoid duplicates.
2. **Open an issue** (optional but recommended) — Describe the change and get early feedback.
3. **Fork and branch** — Create a short-lived branch (`feature/`, `fix/`, `docs/`) from `main`.
4. **Implement** — Follow the [Governance](GOVERNANCE.md) and repository structure:
   - Spec text lives under `versions/` (e.g., `versions/0.1.0-draft/spec.md`).
   - Standardization materials live under `standardization/`.
   - Proposals live under `proposals/`.
   - Examples live under `examples/`.
5. **Commit** — Use [Conventional Commits](https://www.conventionalcommits.org/) (e.g., `docs(spec): add Identity object`, `feat(spec): define Tools object`).
6. **Pull request** — Use the [PR template](.github/PULL_REQUEST_TEMPLATE.md); link related issues.

### Proposal documents

For larger or normative changes, add a proposal under [proposals/](proposals/) (see [proposals/README.md](proposals/README.md)) and reference it in the issue or PR.

## Repository structure

| Path | Purpose |
|------|---------|
| `versions/` | Versioned specification (e.g., `0.1.0-draft/spec.md`). |
| `standardization/` | Roadmap and per-standards-body notes (LF, IETF, ISO). |
| `proposals/` | Spec and process proposals. |
| `examples/` | Example ADL documents. |
| `.github/` | Issue and PR templates. |

## Governance

Decision-making and maintainer roles are described in [GOVERNANCE.md](GOVERNANCE.md).

## License

Contributions are made under the [Apache License 2.0](LICENSE). By submitting a pull request, you agree that your contributions will be licensed under the same license.
