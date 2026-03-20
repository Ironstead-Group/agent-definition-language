# @adl-spec/agent — ADL Explainer Agent

A conversational AI agent that explains ADL concepts, validates documents, and demonstrates the passport model. The agent itself is described by an ADL passport ([`agent.adl.yaml`](./agent.adl.yaml)) and is implemented across 6 language/SDK combinations — proving that a single ADL document can drive agents in any stack.

## How It Works

The agent has 5 read-only tools:

| Tool | What it does |
|------|-------------|
| `explain_concept` | Explains ADL concepts (passport model, permissions, tools, profiles, etc.) |
| `validate_document` | Parses and validates an ADL document, explains errors in plain language |
| `show_example` | Returns example ADL documents (minimal, production, with-tools) |
| `get_spec_section` | Retrieves information about spec sections |
| `compare_formats` | Compares ADL with A2A, MCP, OpenAPI, or Agent Protocol |

At startup, every implementation validates its own passport file as a self-check — demonstrating that ADL passports are machine-verifiable.

## Quick Start

Pick the implementation that matches your preferred SDK:

### TypeScript + Anthropic SDK (Claude)

```bash
cd packages/adl-agent
bun install
export ANTHROPIC_API_KEY=your-key
bun run src/index.ts
```

### TypeScript + OpenAI SDK (GPT-4o)

```bash
cd packages/adl-agent
bun install
export OPENAI_API_KEY=your-key
bun run implementations/openai-ts/index.ts
```

### TypeScript + Google GenAI SDK (Gemini)

```bash
cd packages/adl-agent
bun install
export GOOGLE_API_KEY=your-key
bun run implementations/google-adk-ts/index.ts
```

### Python + Anthropic SDK

```bash
cd packages/adl-agent/implementations/anthropic-py
pip install -r requirements.txt
export ANTHROPIC_API_KEY=your-key
python main.py
```

### Python + OpenAI SDK

```bash
cd packages/adl-agent/implementations/openai-py
pip install -r requirements.txt
export OPENAI_API_KEY=your-key
python main.py
```

### Python + Google GenAI SDK

```bash
cd packages/adl-agent/implementations/google-adk-py
pip install -r requirements.txt
export GOOGLE_API_KEY=your-key
python main.py
```

## Usage

All implementations provide the same interactive CLI experience:

```
Welcome to the ADL Spec Explainer!
Ask me anything about the Agent Definition Language.
Type "exit" or "quit" to leave.

> What is the passport model?
An ADL document is like a passport — a portable, self-contained trust
signal that travels with an agent. It declares the agent's identity,
capabilities, permissions, and trust signals...

> Validate this:
> adl_spec: "0.2.0"
> name: My Agent
The document is missing required fields: description, version, and
data_classification...

> Compare ADL with MCP
ADL and MCP are complementary. MCP defines how models access tools,
resources, and prompts. ADL describes the agent that uses those
capabilities...
```

## Project Structure

```
packages/adl-agent/
├── agent.adl.yaml              # The agent's own ADL passport
├── knowledge/                  # Language-agnostic knowledge (JSON)
│   ├── concepts.json           #   10 ADL concept explanations
│   └── comparisons.json        #   4 format comparisons
├── src/                        # Shared TypeScript layer
│   ├── shared.ts               #   Tool registry, system prompt, executeTool()
│   ├── tools/                  #   Tool implementations (used by all TS impls)
│   │   ├── explain-concept.ts
│   │   ├── validate-document.ts
│   │   ├── show-example.ts
│   │   ├── get-spec-section.ts
│   │   └── compare-formats.ts
│   ├── knowledge/              #   TS loaders for knowledge JSON
│   ├── agent.ts                #   Anthropic SDK agent loop (default)
│   └── index.ts                #   Default CLI entry point (Anthropic)
├── implementations/
│   ├── anthropic-ts/           #   TypeScript + Anthropic SDK
│   ├── openai-ts/              #   TypeScript + OpenAI SDK
│   ├── google-adk-ts/          #   TypeScript + Google GenAI SDK
│   ├── anthropic-py/           #   Python + Anthropic SDK
│   ├── openai-py/              #   Python + OpenAI SDK
│   └── google-adk-py/          #   Python + Google GenAI SDK
└── tests/
```

### How sharing works

**TypeScript implementations** import shared tools directly:

```typescript
import { SYSTEM_PROMPT, TOOLS, executeTool } from "../../src/shared.js";
```

**Python implementations** each have their own `tools.py` that loads the same knowledge JSON:

```python
import json, os
knowledge_dir = os.path.join(os.path.dirname(__file__), "..", "..", "knowledge")
with open(os.path.join(knowledge_dir, "concepts.json")) as f:
    concepts = json.load(f)
```

The tool behavior is identical across all 6 implementations. Only the agent loop differs — how each SDK structures tool calls and responses.

## The Passport

The agent describes itself using ADL (`agent.adl.yaml`). This is the demo of the passport model — the same document that describes the agent is also validated by the agent at startup:

```yaml
adl_spec: "0.2.0"
name: ADL Spec Explainer
description: >-
  An AI agent that explains ADL concepts, validates documents,
  shows examples, and compares agent description formats.
version: "0.1.0"

data_classification:
  sensitivity: public

tools:
  - name: explain_concept
    description: Explain an ADL concept...
    read_only: true
  # ... 4 more tools

permissions:
  network:
    allowed_hosts:
      - adl-spec.org

security:
  authentication:
    type: none
```

## A2A Discovery Demo

A self-contained demo showing two agents: one discovers the other via the spec-defined `/.well-known/adl-agents` endpoint (Section 6.4), fetches its ADL passport, converts to an A2A Agent Card, evaluates trust, and invokes skills via A2A tasks. No API keys needed — runs entirely locally with no LLM calls.

```bash
cd packages/adl-agent
bun run examples/a2a-discovery/run-demo.ts
```

```
Phase 1: DISCOVERY (spec Section 6.4)
  GET /.well-known/adl-agents → found 1 agent
  GET /agents/adl-explainer   → fetched passport

Phase 2: FETCH & VALIDATE PASSPORT
  Parsed: ADL Spec Explainer v0.1.0
  Validated: no errors

Phase 3: TRUST EVALUATION
  Data sensitivity: public
  All tools read-only: true
  Evaluation: PASSED

Phase 4: A2A COMMUNICATION
  Task 1: explain_concept("passport model") → completed
  Task 2: validate_document(...)             → completed
  Task 3: show_example("minimal")            → completed
  Task 4: compare_formats("a2a")             → completed
```

See [`examples/a2a-discovery/README.md`](./examples/a2a-discovery/README.md) for the full architecture and how to run each agent separately.

## Adding a New Implementation

To add a new language or SDK:

1. Create a directory under `implementations/` (e.g., `langchain-py/`)
2. Load knowledge from `../../knowledge/*.json`
3. Implement the 5 tools with the same behavior
4. Map tools to your SDK's format
5. Build the agent loop (call LLM, handle tool calls, return text)
6. Add a CLI entry point with self-check and interactive loop

The passport, tools, and knowledge are already defined — you just need to wire them into your SDK.

## Tests

```bash
cd packages/adl-agent
bun test
```

Tests cover:
- Passport validation (the agent's own ADL document is valid)
- Tool parity (passport tool list matches implementation)
- All 5 tool functions (unit tested without calling any LLM)
- Knowledge base completeness (all concepts and comparisons defined)

## License

Apache-2.0
