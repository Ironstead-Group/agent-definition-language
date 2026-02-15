# Governance

This document describes how the Agent Definition Language (ADL) specification and repository are governed.

## Goals

- **Open development:** The specification evolves in the open with input from the community and potential standards bodies.
- **Stability:** Changes follow a clear process and versioning so that implementers can rely on the spec.
- **Standards-ready:** Structure and process support submission to multiple standards organizations (e.g., Linux Foundation AAIF (Agentic AI Foundation), IETF RFC, ISO).

## Repository and spec ownership

- The **repository** is the source of truth for the draft specification and related materials.
- **Specification text** is maintained under `versions/` (e.g., `versions/0.1.0-draft/spec.md`). The Markdown in that directory is the authoritative draft until a standards body publishes an official standard.
- **Standardization** materials (roadmap, bodies, submission drafts) are maintained under `standardization/`.

## Decision-making

- **Trunk-based development:** The default branch is `main` and is kept deployable. Work happens on short-lived branches and is merged via pull requests.
- **Pull requests:** All changes flow through pull requests. Maintainers (or designated reviewers) review and merge. Consensus is preferred; where consensus is unclear, maintainers decide.
- **Breaking changes:** Substantive or breaking changes to the spec should be discussed in an issue or proposal (under `proposals/`) before implementation. Version bumps (e.g., 0.1.0 → 0.2.0) follow [Semantic Versioning](https://semver.org/) where applicable.
- **Standardization submissions:** Submissions to external standards bodies (e.g., Linux Foundation, IETF, ISO) should be aligned with the maintainers and documented under `standardization/`.

## Maintainers

- **Maintainers** are responsible for reviewing pull requests, merging changes, and shepherding the spec and standardization strategy.
- The initial maintainer set is defined by the project owners. New maintainers may be added by existing maintainers based on contribution and commitment.
- Maintainers are listed in the repository (e.g., in [README.md](README.md) or a dedicated MAINTAINERS.md) once the project is public.

## Versioning and releases

- **Draft versions** (e.g., `0.1.0-draft`) are maintained in `versions/<version>/`. A release is a tagged snapshot of the repo (e.g., `v0.1.0-draft`).
- **Stable versions** (post-1.0 or post-standardization) will follow a clear release process (release notes, changelog, tagging).
- Details may be extended in a separate RELEASE_PROCESS.md when needed.

## Relationship to standards bodies

- This repository is **independent** of any single standards body. Work here is intended to be submitted to one or more bodies (Linux Foundation, IETF, ISO, etc.).
- Once a body adopts or publishes ADL (or a derivative), the relationship (e.g., mirror repo, liaison) will be documented under `standardization/` and in the README.

## Changes to this document

Changes to GOVERNANCE.md are made via pull request and require review. Significant process changes should be discussed in an issue or proposal first.
