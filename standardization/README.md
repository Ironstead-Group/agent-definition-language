# Standardization Roadmap

This directory documents the strategy and status for proposing the Agent Definition Language (ADL) to various standards organizations. ADL is intended to become a widely adopted, vendor-neutral standard—similar to OpenAPI (OpenAPI Initiative / Linux Foundation) and AsyncAPI.

## Target Standards Bodies

| Organization | Acronym / Project | Focus | Notes |
|--------------|------------------|--------|--------|
| **Linux Foundation** | OAI, AAIF (Agentic AI Foundation / LF AI) | Collaborative projects, API & AI specs | OpenAPI and AsyncAPI are LF projects; natural fit for an “Agent API” spec. |
| **IETF** | RFC | Internet standards, protocols | RFC track for formal specification (e.g., document format, semantics). |
| **ISO** | ISO/IEC JTC 1 (SC 42 AI) | International standards for AI | Broader adoption, procurement, and regulatory alignment. |
| **OASIS** | OASIS Open | Open standards (e.g., TOSCA, OData) | Alternative or complement to IETF for specification work. |
| **W3C** | — | Web standards | If ADL is tightly coupled to web platforms or linked data. |

## Directory Contents

- **[roadmap.md](./roadmap.md)** — Phases, milestones, and submission timeline.
- **[bodies/](./bodies/)** — Per-organization notes, contacts, and submission requirements (e.g., Agentic AI Foundation, RFC, ISO).
- **[templates/](./templates/)** — Body-specific boilerplate (IETF, ISO, LF) for programmatic generation. See [scripts/](../scripts/README.md) for how the spec is turned into body-specific documents.
- **output/** — Generated drafts (e.g. IETF-style, ISO-style) from `scripts/`; may be gitignored.
- **Changelog** — Updates to this roadmap (can be in `roadmap.md` or a separate file).

## Contributing to Standardization

Proposals for submission text, liaison contacts, or process changes belong in the [proposals/](../proposals/) directory or as pull requests. See [CONTRIBUTING.md](../CONTRIBUTING.md) for how to contribute.
