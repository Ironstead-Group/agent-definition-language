# Research: OpenClaw

**Date:** 2026-03-21
**Author:** ADL Working Group
**Purpose:** Reference document for ADL interoperability planning

## 1. Overview

OpenClaw is an open-source AI agent orchestration platform that has become the de facto standard for deploying autonomous agents. Originally released as "Clawdbot" by Peter Steinberger in November 2025, renamed to OpenClaw on January 30, 2026, it has grown to **285,000+ GitHub stars** and **42,000+ deployed instances** — the fastest-growing open-source project in history.

OpenClaw provides:
- A **gateway** (control plane) for orchestrating agent sessions and routing events
- An **agent runtime** that executes turns (LLM call → tool use → state write → reply)
- A **skills system** with 5,400+ registered skills for agent capabilities
- **Multi-agent** support with independent identities and model settings
- **ROS 2 Humble** integration for robotics hardware communication

## 2. Architecture

### 2.1 Gateway (Control Plane)

The gateway operates as a **hub-and-spoke** control plane sitting between user inputs (WhatsApp, iMessage, Slack, macOS app, web UI, CLI) and AI agents. It requires **Node.js 22+** and is configured via `openclaw.json` (JSON5 format).

**Deterministic ingress** follows four phases:
1. **Handshake** — First frame must be a connect message with challenge/auth credentials
2. **Authorization** — Role and scopes determine whether a method is allowed
3. **Dispatch** — Routes the request to the appropriate handler
4. **Broadcast** — Pushes execution progress as event streams back to channels

The gateway also processes non-user events: timers, schedules, webhooks, and hooks can create events that trigger normal agent turns at any time (e.g., 3:00 AM automations).

### 2.2 Agent Runtime

Agents operate in a **turn-based** model:

1. **Receive** — Message hits a channel
2. **Route** — Gateway routes it to a session (main, group, or isolated)
3. **Context + LLM + Tools** — Agent loads context and skills for the session, sends conversation to the LLM, runs any tools the model requests
4. **Stream** — Streams the reply back to the channel
5. **Persist** — Writes conversation and memory into the workspace

Each agent has:
- An **identity** (name, emoji, theme, avatar — configured via `set-identity` command)
- A **model** with primary + fallback chain
- A **workspace** directory for file access
- **Memory** (daily files + curated knowledge base)
- **Tool policies** governing which actions require approval

### 2.3 Multi-Agent Coordination

OpenClaw supports multiple agents within a single gateway, each with distinct identity, workspace, memory, and channel bindings:

**Routing:**
- **Deterministic routing** — Bindings follow "most specific wins" (e.g., WhatsApp → fast agent, Telegram → Opus agent)
- **Peer matching** — Single DM/group routing to specific agents via `match.peer` bindings (always wins over channel-wide rules)

**Inter-agent communication:**
- `agentToAgent` and `sessions_send` APIs
- Webhooks routed to different agent sessions
- Designated communication channels (hidden Slack channels, internal queues)
- One agent's output posted to channels another agent subscribes to

**Best practice:** Route through a coordinator agent. Coordinator decisions (classify, route, aggregate) don't require the most capable model, so a cheaper model for coordination is recommended.

### 2.4 Agent Discovery (kagenti-operator)

OpenClaw has an auto-discovery mechanism via **AgentCard CRDs** that:
- Injects agent identity (SPIFFE/SPIRE), tracing, and tool governance
- Manages the full lifecycle from discovery to runtime
- Supports **Bring Your Own Agent (BYOA)** without requiring proprietary frameworks
- Uses the **Context Engine** as a pluggable slot for custom context management

### 2.5 ROS 2 Integration

For robotics use cases, OpenClaw uses ROS 2 Humble as real-time message-passing middleware:
- Publishes commands to topics: `/openclaw/cmd_vel` (velocity), `/openclaw/gimbal` (pan/tilt), `/openclaw/lights`
- Subscribes to sensor data topics
- Uses **WebRTC** for low-latency camera connections

**SpatialRAG + Voxelization:**
- Converts raw 3D LIDAR point clouds into **voxels** (3D pixels) — searchable, memory-efficient
- Each voxel carries: spatial vector embedding, semantic label, timestamp
- Enables spatial queries: "Where was object X?", "What events happened at location Y?"
- Combines video, radar detections, frame images, and odometry data
- Continuously updates voxel map as robot moves

## 3. Configuration (openclaw.json)

### 3.1 Format

OpenClaw uses **JSON5** configuration (allowing comments and trailing commas). The config file is located at `~/.openclaw/openclaw.json`.

**Key properties:**
- All fields are optional with safe defaults
- Validated using **Zod schema** across multiple files:
  - `src/config/zod-schema.ts` — Root schema
  - `src/config/zod-schema.agents.ts` — Agent configuration
  - `src/config/zod-schema.agent-runtime.ts` — Runtime settings
  - `src/config/zod-schema.session.ts` — Session management
  - `src/config/zod-schema.providers-core.ts` — Provider definitions
- Gateway refuses to start with unknown keys, type mismatches, or invalid values (strict validation)
- Supports `$schema` root-level key for editor tooling

### 3.2 Structure

OpenClaw uses a **defaults-with-overrides** pattern:

```json5
{
  // Baseline config for all agents
  agents: {
    defaults: {
      workspace: "~/.openclaw/workspace",
      model: {
        primary: "anthropic/claude-sonnet-4-5",
        fallbacks: ["openai/gpt-5.2"]
      },
      identity: {
        name: "default-agent",
        emoji: "🦞",
        theme: "dark"
      }
    },

    // Per-agent overrides
    list: [
      {
        id: "main",
        identity: { name: "Claude", emoji: "🦞" },
        model: {
          primary: "anthropic/claude-opus-4-6",
          fallbacks: ["anthropic/claude-sonnet-4-5"]
        }
      },
      {
        id: "fast-agent",
        model: { primary: "anthropic/claude-sonnet-4-5" }
      }
    ]
  },

  // Communication channels
  channels: {
    whatsapp: { allowFrom: ["+15555550123"] },
    slack: { /* Slack config */ },
    discord: { /* Discord config */ }
  },

  // Tool configuration
  tools: { /* tool settings */ },

  // Model provider settings
  models: { /* provider-specific config */ },

  // Memory backend configuration
  memory: { /* memory settings */ },

  // Gateway-specific settings
  gateway: { /* gateway config */ }
}
```

### 3.3 Model Catalog

Models use a `provider/model` naming convention:
- `anthropic/claude-opus-4-6`
- `openai/gpt-5.2`
- `nvidia/nemotron-3-super`
- Custom OpenAI-compatible endpoints supported
- Model aliases for convenience (e.g., "Sonnet", "GPT")
- Shared `/fast` mode across OpenAI and Anthropic paths
- First-class Ollama onboarding for local models
- 50+ integrations via OpenRouter and AI/ML APIs

## 4. Skills System

### 4.1 SKILL.md Format

Skills are markdown files with YAML frontmatter, organized in directories:

```
skills/
├── search_documents/
│   └── SKILL.md
├── send_email/
│   └── SKILL.md
└── query_database/
    └── SKILL.md
```

**SKILL.md structure:**
```markdown
---
name: skill_name
description: What the skill does
version: 1.0.0
metadata:
  openclaw:
    requires:
      env: [REQUIRED_ENV_VAR]
      bins: [binary-name]
      anyBins: [optional1, optional2]  # at least one must exist
      config: [/path/to/config]
    primaryEnv: MAIN_CREDENTIAL_VAR
parameters:
  param_name:
    type: string
    description: Parameter description
    required: true
returns:
  type: object
  description: What the skill returns
---

# skill_name

Step-by-step instructions in plain English:
- What to do
- Which tools to call
- What rules to follow
```

The YAML frontmatter defines the skill's interface, runtime requirements, and metadata. The markdown body provides natural-language instructions that teach the agent how to use the skill.

**Note:** The embedded agent skill parser supports single-line YAML frontmatter keys only.

### 4.2 Skill Discovery and Loading

Skills go through a multi-stage loading pipeline:

1. **Discovery** — Finds candidates from configured paths, workspace roots, global extension roots, and bundled extensions
2. **Registry** — Reads `openclaw.plugin.json` plus package metadata
3. **Decision** — Core determines whether each skill is: enabled, disabled, blocked, or selected for an exclusive slot
4. **Loading** — Enabled skills are loaded in-process via **jiti** and registered into a central registry
5. **Exposure** — Registry exposes tools, channels, provider setup, hooks, HTTP routes, CLI commands, and services

Skills are filtered at load time based on environment variables, configuration settings, and binary availability.

### 4.3 Skill Categories

The Skills Registry (5,400+) organizes skills into categories:
- **Coding Agents and IDEs:** Agent development, testing, code management
- **Web and Frontend Development:** Web dev, deployment, SEO
- **Productivity and Tasks:** Task management, automation, collaboration
- **Git and GitHub:** Version control, repository management
- **Media and Streaming:** Audio, video, content generation
- **Infrastructure and Deployment:** Cloud services, DevOps
- **Communication:** Slack, Gmail, Discord, Telegram, WhatsApp
- **Data:** Database queries, API calls, web scraping
- **Security:** Security audits, vulnerability scanning
- **Robotics:** Motor control, sensor reading, navigation (via ROS 2)

### 4.4 Custom Skills

Creating a custom skill involves:
1. Creating a directory under `skills/`
2. Writing a `SKILL.md` with frontmatter defining the interface and requirements
3. Declaring runtime requirements (env vars, binaries, configs) in `metadata.openclaw.requires`
4. Writing step-by-step instructions agents can follow
5. The skill is automatically discovered on gateway restart

## 5. Agent Workspace and Memory

### 5.1 Workspace Files

The agent workspace contains structured files that shape agent behavior:

| File | Purpose | Loaded When |
|------|---------|-------------|
| `AGENTS.md` | Operating instructions (rules, priorities, behavior) | Every session start |
| `IDENTITY.md` | Core persona, quirks, relationships | Session start |
| `SOUL.md` | Deep behavioral traits, long-term goals | Session start |
| `USER.md` | Known info about the user (preferences, style) | Session start |
| `MEMORY.md` | Curated persistent knowledge base | Main/private sessions only |
| `memory/YYYY-MM-DD.md` | Daily context (append-only log) | Today + yesterday loaded |

**Workspace boundaries:**
- Workspace is the default `cwd` for file tools
- Separate from `~/.openclaw/` (which stores config, credentials, sessions)
- Tools resolve relative paths against the workspace
- Not a hard sandbox — absolute paths can reach elsewhere unless sandboxing is enabled
- When `workspaceAccess` is not "rw" and sandboxing enabled, tools operate in `~/.openclaw/sandboxes`

### 5.2 Memory System

**Daily files (`memory/YYYY-MM-DD.md`):**
- Append-only daily log
- Today's and yesterday's files loaded at session start
- Contains day-to-day notes and running context

**Curated memory (`MEMORY.md`):**
- Persistent, agent-maintained knowledge base
- Contains: decisions, preferences, durable facts
- Loaded only in main/private sessions (never in group contexts)
- Takes precedence over lowercase `memory.md` if both exist

**Memory tools available to agents:**
- `memory_search` — Semantic recall over indexed snippets
- `memory_get` — Targeted read of specific Markdown file/line ranges

## 6. Agent Policies and Security

### 6.1 Tool Policies

Per-agent allow/deny lists are the primary governance mechanism:
- **Deny list wins** — If denied, a tool cannot be used regardless of allow list
- Each agent should have access to exactly the tools needed for its role

### 6.2 Exec Approvals

A companion app/node host guardrail for sandboxed agents:

**Approval mechanics:**
- Command execution requires: policy + allowlist + (optional) user approval — all must agree
- Approved runs bind a **canonical execution context**:
  - Canonical current working directory
  - Exact command-line arguments
  - Environment variable binding when present
  - Pinned executable path when applicable

**File drift detection:**
- If an approved file changes after approval but before execution, the run is **denied**
- Prevents time-of-check-to-time-of-use (TOCTOU) attacks

**Shell chaining:**
- `&&`, `||`, `;` allowed only when **every** top-level segment satisfies the allowlist

**Management:**
- Stored in `~/.openclaw/exec-approvals.json` under `agents.<id>.allowlist`
- Manageable via Control UI or `openclaw approvals allowlist ...` CLI
- Enforced locally on execution host (gateway host or node host)

### 6.3 Security Model

OpenClaw's native security is **permissive by default** (unlike ADL's deny-by-default):
- Agents have broad access unless explicitly restricted
- No kernel-level sandboxing (NemoClaw adds this)
- No formal authentication or encryption requirements
- Browser origin validation enforced for all browser-originated connections
- Security relies on tool policies and exec approvals

This is a significant gap that NemoClaw addresses and that ADL's permission model could help fill.

## 7. Extension Mechanisms

### 7.1 Plugins

Four types of gateway extensions written in TypeScript/JavaScript:

1. **Channel Plugins** — Additional messaging platforms (Teams, Matrix, Mattermost)
2. **Memory Plugins** — Alternative storage backends (vector databases, SQL)
3. **Tool Plugins** — Custom agent capabilities beyond built-in operations
4. **Provider Plugins** — Custom LLM providers (self-hosted models)

**Plugin loading pipeline:**
1. Finds candidates from configured paths, workspace roots, global extension roots, bundled extensions
2. Reads `openclaw.plugin.json` plus package metadata
3. Determines: enabled / disabled / blocked / exclusive status
4. Loads enabled plugins in-process via **jiti**
5. Registers into central registry
6. Exposes: tools, channels, provider setup, hooks, HTTP routes, CLI commands, services

### 7.2 Webhooks

HTTP endpoints that turn OpenClaw from "a chat assistant" into "a system that reacts":
- External events notify OpenClaw via HTTP POST
- Webhook takes inbound event → triggers agent run or lightweight wake-up
- Routes execution result back to configured channel
- **Common pattern:** Webhook wakes agent → skill fetches data/runs operation → returns result

### 7.3 Channels

Multi-channel architecture with unified routing:
- **Slack:** Socket Mode (WebSocket, no inbound HTTP) or HTTP Events API
- **Discord:** Structured around servers, channels, threads, roles
- **WhatsApp, Telegram, iMessage:** Additional platforms
- **Web UI, CLI:** Built-in interfaces
- One gateway receives from all platforms into the same session store, enabling cross-platform context sharing

## 8. Ecosystem and Adoption

### 8.1 Key Integrations

- **Crypto.com:** AI trading agent via Agent Key feature. Trade execution through messaging apps.
- **Supabase:** MCP integration via Composio. Community projects: SupaClaw, n8n-claw.
- **ROS 2 / RosClaw:** Natural-language control of physical robots
- **Composio:** Managed authentication and token refresh for API integrations
- **50+ SaaS platforms** via skills and plugins

### 8.2 Adoption Metrics

| Metric | Value |
|--------|-------|
| GitHub stars | 285,000+ |
| Deployed instances | 42,000+ publicly exposed |
| Growth rate | Fastest-growing OSS project in history |
| Time to 100k stars | Fraction of time other major projects took |
| Geographic reach | North America, China, Europe, global |

**User base:** Small businesses (lead generation automation), freelancers (task automation), developers (autonomous AI solutions), roboticists (physical automation).

### 8.3 Version History

| Date | Version/Event | Highlights |
|------|--------------|------------|
| Nov 2025 | Original release as "Clawdbot" | Genesis by Peter Steinberger |
| Jan 30, 2026 | Renamed to OpenClaw | Viral adoption begins |
| Mar 7, 2026 | v2026.3.7 | ContextEngine Deep Dive — context management as plugin slot |
| Mar 11, 2026 | v2026.3.11 | Browser origin validation, iOS improvements |
| Mar 12, 2026 | v2026.3.12 | Control UI refresh, shared `/fast` mode, first-class Ollama |
| Mar 2026 | v2026.3.13 (latest) | Multi-platform changes, recovery tag |

**Versioning scheme:** `vYYYY.M.D` format. Stable tagged releases + beta prerelease tags. Dev channel follows moving head of main.

### 8.4 Related Projects

- **NemoClaw** (Nvidia) — Enterprise security/privacy wrapper (see [nemoclaw.md](./nemoclaw.md))
- **RosClaw** — ROS 2 integration layer for physical robots
- **OpenShell** (Nvidia) — Sandbox runtime for agent isolation

## 9. Gaps Relevant to ADL

The following capabilities are absent in OpenClaw but present in ADL:

| Capability | OpenClaw Status | ADL Equivalent |
|-----------|----------------|----------------|
| **Agent identity** | Informal (name/emoji only) | Globally unique ID (HTTPS URI, DID, URN) with cryptographic identity |
| **Versioning** | Calendar-based platform versioning only | SemVer per-agent with lifecycle management |
| **Lifecycle management** | No formal lifecycle | draft → active → deprecated → retired |
| **Standardized discovery** | kagenti-operator (K8s-specific) | `/.well-known/adl-agents` (HTTP-based, universal) |
| **Declarative permissions** | Permissive by default, ad-hoc policies | Deny-by-default, 5 structured domains |
| **Data classification** | No sensitivity tracking | Sensitivity levels with handling constraints |
| **Security attestation** | None (NemoClaw adds some) | Authentication, encryption, attestation records |
| **Compliance frameworks** | None native | Governance profile with NIST, SOC2, ISO, GDPR, etc. |
| **Structured tool schemas** | Markdown + YAML frontmatter | JSON Schema with full type system |

These gaps represent the value ADL brings to the OpenClaw ecosystem.

## References

- [OpenClaw Documentation](https://docs.openclaw.ai/)
- [OpenClaw Architecture — Part 1: Control Plane, Sessions, and the Event Loop](https://theagentstack.substack.com/p/openclaw-architecture-part-1-control)
- [Gateway Architecture](https://docs.openclaw.ai/concepts/architecture)
- [Agent Runtime](https://docs.openclaw.ai/concepts/agent)
- [Configuration Reference](https://docs.openclaw.ai/gateway/configuration)
- [Skills Guide](https://docs.openclaw.ai/tools/skills)
- [Skill Format Documentation](https://github.com/openclaw/clawhub/blob/main/docs/skill-format.md)
- [Memory](https://docs.openclaw.ai/concepts/memory)
- [Multi-Agent Routing](https://docs.openclaw.ai/concepts/multi-agent)
- [Exec Approvals](https://docs.openclaw.ai/tools/exec-approvals)
- [Webhooks](https://docs.openclaw.ai/automation/webhook)
- [What are OpenClaw Skills? A 2026 Developer's Guide](https://www.digitalocean.com/resources/articles/what-are-openclaw-skills)
- [OpenClaw CLI and Config Reference](https://lumadock.com/tutorials/openclaw-cli-config-reference)
- [OpenClaw Memory Masterclass](https://velvetshark.com/openclaw-memory-masterclass)
- [OpenClaw Multi-Agent Coordination and Governance](https://lumadock.com/tutorials/openclaw-multi-agent-coordination-governance)
- [OpenClaw API Integration — Crypto.com](https://crypto.com/us/product-news/openclaw-integration)
- [ROSClaw: Giving AI Agents Claws to Manipulate the Physical World](https://robohorizon.com/en-gb/news/2026/02/rosclaw-ai-physical-claws/)
- [OpenClaw Releases](https://github.com/openclaw/openclaw/releases)
- [OpenClaw Public Exposure Mapping — Censys](https://censys.com/blog/openclaw-in-the-wild-mapping-the-public-exposure-of-a-viral-ai-assistant/)
- [5,400+ Skills Registry](https://github.com/VoltAgent/awesome-openclaw-skills)
- [OpenClaw + Robotics Revolution](https://www.openclawrobotics.com/)
