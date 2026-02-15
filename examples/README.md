# ADL Examples

This directory contains **example** Agent Definition Language (ADL) documents. They illustrate the specification and can be used to validate tooling.

## Conventions

- Examples SHOULD be valid against the ADL version they target.
- **0.1.0-draft:** JSON; root uses `adl`, `name`, `description`, `version` (snake_case). See `*-0.1.0.json` below.
- **minimal.yaml:** Legacy 0.1.0 style with `adlVersion` and `info` object (YAML).

## Index

| File | ADL Version | Description |
|------|-------------|-------------|
| [minimal.yaml](./minimal.yaml) | 0.1.0 (legacy) | Minimal valid agent (adlVersion + info). |
| [minimal-0.1.0.json](./minimal-0.1.0.json) | 0.1.0 | Minimal valid agent (adl, name, description, version). |
| [with-tools-0.1.0.json](./with-tools-0.1.0.json) | 0.1.0 | Agent with tool definitions (calculator). |
| [production-0.1.0.json](./production-0.1.0.json) | 0.1.0 | Production-style agent (identity, model, tools, resources, prompts, permissions, security, runtime, metadata). |

## Contributing

New examples are welcome. Ensure they conform to the target spec version and add an entry to the index above. See [CONTRIBUTING.md](../CONTRIBUTING.md).
