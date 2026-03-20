# ADL Implementations

Tools, libraries, and platforms that implement or consume the Agent Definition Language (ADL) specification. For full details and usage examples, see [adl-spec.org/implementations](https://adl-spec.org/implementations).

## How to add an implementation

Open a pull request that adds an entry below. Include:

- **Name** — Project or product name.
- **Type** — Validator, parser, code generator, runtime, SDK, etc.
- **ADL version** — Spec version supported (e.g., `0.2.0`).
- **Link** — URL to repo, docs, or product page.
- **License** — If open source (e.g., Apache-2.0, MIT).
- **Description** — One sentence.

## Official Tools

| Name | Type | ADL Version | Description | Link |
|------|------|-------------|-------------|------|
| @adl-spec/cli | Validator / Converter / Generator | 0.1.0, 0.2.0 | CLI for validating, converting, scaffolding, and generating agent code from ADL documents. | [source](packages/adl-cli/) |
| ADL JSON Schema (0.2.0) | Schema | 0.2.0 | JSON Schema for ADL 0.2.0 — use in any editor or validation library. | [schema.json](https://adl-spec.org/0.2/schema.json) · [source](versions/0.2.0/schema.json) |
| ADL JSON Schema (0.1.0) | Schema | 0.1.0 | JSON Schema for ADL 0.1.0. | [schema.json](https://adl-spec.org/0.1/schema.json) · [source](versions/0.1.0/schema.json) |

## Parsers / SDKs

| Name | Language | ADL Version | Description | Link |
|------|----------|-------------|-------------|------|
| @adl-spec/core | TypeScript | 0.1.0, 0.2.0 | Reference SDK — typed parser, multi-version validator (all 28 error codes), A2A/MCP converters, type guards. | [source](packages/adl-core/) |

## Code Generators

| Name | Language | Targets | Description | Link |
|------|----------|---------|-------------|------|
| @adl-spec/generator | TypeScript | claude-sdk-ts, vanilla-ts | Generates agent code from ADL passports via a two-stage pipeline (ADL → IR → target code). Pluggable target architecture. | [source](packages/adl-generator/) |

## Agent Implementations

| Name | Language / SDK | Description | Link |
|------|---------------|-------------|------|
| @adl-spec/agent (Anthropic TS) | TypeScript / Anthropic SDK | ADL Explainer agent — interactive CLI powered by Claude. | [source](packages/adl-agent/implementations/anthropic-ts/) |
| @adl-spec/agent (OpenAI TS) | TypeScript / OpenAI SDK | ADL Explainer agent — interactive CLI powered by GPT-4o. | [source](packages/adl-agent/implementations/openai-ts/) |
| @adl-spec/agent (Google GenAI TS) | TypeScript / Google GenAI SDK | ADL Explainer agent — interactive CLI powered by Gemini. | [source](packages/adl-agent/implementations/google-adk-ts/) |
| @adl-spec/agent (Anthropic Python) | Python / Anthropic SDK | ADL Explainer agent — Python CLI powered by Claude. | [source](packages/adl-agent/implementations/anthropic-py/) |
| @adl-spec/agent (OpenAI Python) | Python / OpenAI SDK | ADL Explainer agent — Python CLI powered by GPT-4o. | [source](packages/adl-agent/implementations/openai-py/) |
| @adl-spec/agent (Google GenAI Python) | Python / Google GenAI SDK | ADL Explainer agent — Python CLI powered by Gemini. | [source](packages/adl-agent/implementations/google-adk-py/) |

All 6 implementations share the same ADL passport ([agent.adl.yaml](packages/adl-agent/agent.adl.yaml)) and implement the same 5 tools — demonstrating that a single ADL document can drive agents across languages and SDKs.

## Demos

| Name | Description | Link |
|------|-------------|------|
| A2A Discovery Demo | Two-agent demo: discovers agents via `/.well-known/adl-agents` (spec Section 6.4), fetches and validates the ADL passport, converts to A2A Agent Card, evaluates trust, and communicates via A2A tasks. No API keys needed. | [source](packages/adl-agent/examples/a2a-discovery/) |

## IDE Support

| Editor | How | Prerequisites |
|--------|-----|---------------|
| VS Code (JSON) | Add schema mapping to `.vscode/settings.json` | None |
| VS Code (YAML) | Add schema mapping to `.vscode/settings.json` | [YAML extension](https://marketplace.visualstudio.com/items?itemName=redhat.vscode-yaml) |
| JetBrains IDEs | Settings > JSON Schema Mappings | None |

## Runtimes / Platforms

*Be the first — [open a PR](https://github.com/Ironstead-Group/agent-definition-language/pulls).*

---

*If you implement ADL, we encourage you to open a PR to be listed here.*
