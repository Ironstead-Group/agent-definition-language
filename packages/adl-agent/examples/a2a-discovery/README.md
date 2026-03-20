# A2A Discovery Demo

Two agents demonstrating the full ADL discovery and A2A communication flow per spec Section 6.4.

## What happens

1. **Service Agent** loads its ADL passport and starts an HTTP server with the spec-defined endpoints
2. **Discovery Agent** hits `/.well-known/adl-agents` to find available agents
3. From the discovery document, it fetches the agent's ADL passport via the `adl_document` URL
4. Parses and validates the passport with `@adl-spec/core`
5. Converts to an A2A Agent Card to read capabilities
6. Evaluates trust signals (data sensitivity, auth type, read-only tools)
7. Invokes skills via A2A task requests

## Run it

```bash
cd packages/adl-agent
bun run examples/a2a-discovery/run-demo.ts
```

Or start each agent separately:

```bash
# Terminal 1
bun run examples/a2a-discovery/service-agent.ts

# Terminal 2
bun run examples/a2a-discovery/discovery-agent.ts
```

No API keys needed — runs entirely locally, no LLM calls.

## Endpoints (Service Agent)

Per ADL spec Section 6.4 and Section 15.1:

| Method | Path | Spec | Description |
|--------|------|------|-------------|
| GET | `/.well-known/adl-agents` | Section 6.4 | Discovery document listing available agents |
| GET | `/agents/adl-explainer` | Section 6.1 | ADL passport (`application/adl+json`) |
| GET | `/agents/adl-explainer/a2a` | Section 15.1 | A2A Agent Card (auto-converted from passport) |
| POST | `/a2a/tasks` | — | A2A task submission `{ id, skill, input }` |

## Flow

```
Discovery Agent                            Service Agent
     │                                          │
     │  GET /.well-known/adl-agents              │
     │──────────────────────────────────────────▶│
     │◀─── { agents: [{ id, adl_document }] } ──│
     │                                          │
     │  GET /agents/adl-explainer                │
     │──────────────────────────────────────────▶│
     │◀──────────── ADL passport (YAML) ────────│
     │                                          │
     │  parseADL() → validateDocument()          │
     │  convertToA2A() → read skills             │
     │  evaluateTrust() → check sensitivity      │
     │                                          │
     │  POST /a2a/tasks                          │
     │  { skill: "explain_concept", ... }        │
     │──────────────────────────────────────────▶│── executeTool()
     │◀──────────── task response ──────────────│
     │           ... more tasks ...              │
```
