# Research: OpenClaw

**Date:** 2026-03-21
**Author:** ADL Working Group
**Purpose:** Reference document for ADL interoperability planning

## 1. Overview

OpenClaw is an open-source AI agent orchestration platform that has become the de facto standard for deploying autonomous agents. Originally focused on robotic manipulation control via ROS 2, it has evolved into a general-purpose agent framework supporting both software and physical environments.

OpenClaw provides:
- A **gateway** (control plane) for orchestrating agent sessions and routing events
- An **agent runtime** that executes turns (LLM call → tool use → state write → reply)
- A **skills system** with 5,400+ registered skills for agent capabilities
- **Multi-agent** support with independent identities and model settings
- **ROS 2 Humble** integration for robotics hardware communication

## 2. Architecture

### 2.1 Gateway (Control Plane)

The gateway is the central orchestration layer. It:
- Routes events between agents, channels, and external systems
- Manages AI provider connections (OpenAI, Anthropic, etc.)
- Controls hardware communication via ROS 2
- Requires **Node.js 22+**
- Configured via `openclaw.json` (JSON5 format)

The gateway event loop processes incoming messages, dispatches them to the appropriate agent, waits for the agent's turn to complete, and routes replies back through the originating channel.

### 2.2 Agent Runtime

Agents operate in a **turn-based** model:

1. **Receive** — An event arrives (user message, webhook, scheduled trigger)
2. **LLM Call** — The agent sends context + message to its configured model
3. **Tool Use** — The LLM may invoke one or more tools (skills)
4. **State Write** — The agent updates its memory and workspace state
5. **Reply** — The agent sends a response through the channel

Each agent has:
- An **identity** (name, model settings, workspace path)
- A **model** from the provider catalog
- A **workspace** directory for file access
- **Memory** (daily files `memory/YYYY-MM-DD.md` + curated `MEMORY.md`)
- **Tool policies** governing which actions require approval

### 2.3 Multi-Agent Coordination

OpenClaw supports multiple agents running concurrently:
- Each agent has independent identity, model, and workspace configuration
- Agents can communicate through shared channels or direct messaging
- High-level goals can be decomposed into subtasks across multiple agents
- No formal coordination protocol — agents interact through shared state and channel events

### 2.4 ROS 2 Integration

For robotics use cases, OpenClaw uses ROS 2 Humble as middleware:
- Publishes commands to topics: `/openclaw/cmd_vel`, `/openclaw/gimbal`, `/openclaw/lights`
- Subscribes to sensor data topics
- Uses **SpatialRAG** and **Voxelization** to convert camera/LIDAR data into searchable environmental memory
- Enables natural-language control of physical robots via chat channels

## 3. Configuration (openclaw.json)

### 3.1 Format

OpenClaw uses **JSON5** configuration (allowing comments and trailing commas). The config file is located at `~/.openclaw/openclaw.json`.

**Key properties:**
- All fields are optional with safe defaults
- Validated using **Zod schema** (`src/config/zod-schema.ts`)
- Gateway refuses to start with unknown keys, type mismatches, or invalid values (strict validation)

### 3.2 Structure

The configuration has three major sections:

```json5
{
  // Model catalog: available AI models
  "models": {
    "anthropic/claude-opus-4-6": {
      // model-specific settings
    },
    "openai/gpt-4": {
      // model-specific settings
    }
  },

  // Agent definitions
  "agents": [
    {
      "name": "my-agent",
      "description": "An agent that does things",
      "model": "anthropic/claude-opus-4-6",
      "model_settings": {
        "temperature": 0.7,
        "max_tokens": 4096
      },
      "workspace": "./agent-workspace"
    }
  ],

  // Communication channels
  "channels": [
    // Channels start automatically when configured
    // Supports Slack, Discord, Telegram, WhatsApp, etc.
  ]
}
```

### 3.3 Model Catalog

Models use a `provider/model` naming convention:
- `anthropic/claude-opus-4-6`
- `openai/gpt-4`
- `nvidia/nemotron-3-super`
- Custom OpenAI-compatible endpoints supported
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

Detailed instructions for the agent on how to use this skill.

## Usage

Examples and guidelines...
```

The YAML frontmatter defines the skill's interface (name, description, parameters, returns). The markdown body provides natural-language instructions that teach the agent how to use the skill.

### 4.2 Skill Discovery and Loading

- Skills are discovered by scanning the `skills/` directory tree
- Each subdirectory containing a `SKILL.md` file is treated as a skill
- **AgentSkills-compatible** skill folders are also supported
- The Skills Registry contains **5,400+** available skills
- Skills abstract hardware and API complexity into high-level agent commands

### 4.3 Skill Categories

Skills cover a wide range of integrations:
- **System operations:** File management, CLI execution, process management
- **Communication:** Slack, Gmail, Discord, Telegram, WhatsApp
- **Data:** Database queries, API calls, web scraping
- **Security:** Security audits, vulnerability scanning
- **Workflow:** Task management, scheduling, CI/CD
- **Robotics:** Motor control, sensor reading, navigation (via ROS 2)

### 4.4 Custom Skills

Creating a custom skill involves:
1. Creating a directory under `skills/`
2. Writing a `SKILL.md` with frontmatter defining the interface
3. Optionally including implementation files (TypeScript/JavaScript)
4. The skill is automatically discovered on gateway restart

## 5. Agent Policies and Security

### 5.1 Tool Policies

OpenClaw provides policy controls for agent actions:
- **Exec approvals:** High-risk actions (shell commands, file writes) can require human approval
- **Tool allowlists/denylists:** Control which skills an agent can invoke
- **Per-agent policies:** Different agents can have different permission levels

### 5.2 Memory Rules

Agent memory follows a structured pattern:
- **Daily files:** `memory/YYYY-MM-DD.md` — automatic daily context
- **Curated memory:** `MEMORY.md` — persistent, agent-maintained knowledge base
- Memory rules prevent agents from sharing API keys or credentials
- Agents cannot execute commands from untrusted sources stored in memory

### 5.3 Security Model

OpenClaw's native security is **permissive by default** (unlike ADL's deny-by-default):
- Agents have broad access unless explicitly restricted
- No kernel-level sandboxing (this is what NemoClaw adds)
- No formal authentication or encryption requirements
- Security relies on tool policies and exec approvals

This is a significant gap that NemoClaw addresses and that ADL's permission model could help fill.

## 6. Extension Mechanisms

### 6.1 Plugins

Deep gateway extensions written in TypeScript/JavaScript:
- Hook into the gateway event loop
- Add new communication channels
- Implement custom middleware
- Access to full gateway runtime context

### 6.2 Webhooks

HTTP endpoints for external system integration:
- External systems notify OpenClaw via POST requests
- Trigger agent actions based on external events
- Simple integration path for existing infrastructure

### 6.3 Channels

Communication channel integrations:
- Start automatically when configured in `openclaw.json`
- Built-in support for Slack, Discord, Telegram, WhatsApp
- Custom channels via the plugin system
- Bidirectional communication (agents receive and send messages)

## 7. Ecosystem and Adoption

### 7.1 Key Integrations

- **Crypto.com:** AI trading agent integration
- **Supabase:** MCP integration for database operations
- **ROS 2:** Robotics hardware control
- **50+ SaaS platforms** via skills and plugins

### 7.2 Community

- Rapidly growing open-source community
- Jensen Huang (Nvidia CEO): "Every company should have an OpenClaw strategy"
- GTC 2026 featured "Build-a-Claw" workshops
- Active plugin and skills ecosystem

### 7.3 Related Projects

- **NemoClaw** (Nvidia) — Enterprise security/privacy wrapper
- **RosClaw** — ROS 2 integration layer for physical robots
- **OpenShell** (Nvidia) — Sandbox runtime for agent isolation

## 8. Gaps Relevant to ADL

The following capabilities are absent in OpenClaw but present in ADL:

| Capability | OpenClaw Status | ADL Equivalent |
|-----------|----------------|----------------|
| **Agent identity** | Informal (name string only) | Globally unique ID (HTTPS URI, DID, URN) with cryptographic identity |
| **Versioning** | No agent versioning | SemVer with lifecycle management |
| **Lifecycle management** | No formal lifecycle | draft → active → deprecated → retired |
| **Standardized discovery** | No discovery mechanism | `/.well-known/adl-agents` |
| **Declarative permissions** | Permissive by default, ad-hoc policies | Deny-by-default, 5 structured domains |
| **Data classification** | No sensitivity tracking | Sensitivity levels with handling constraints |
| **Security attestation** | None (NemoClaw adds some) | Authentication, encryption, attestation records |
| **Compliance frameworks** | None native | Governance profile with NIST, SOC2, ISO, GDPR, etc. |
| **Structured tool schemas** | Markdown + YAML frontmatter | JSON Schema with full type system |

These gaps represent the value ADL brings to the OpenClaw ecosystem.

## References

- [OpenClaw Documentation](https://docs.openclaw.ai/)
- [OpenClaw Architecture — Part 1: Control Plane, Sessions, and the Event Loop](https://theagentstack.substack.com/p/openclaw-architecture-part-1-control)
- [OpenClaw Skills Guide](https://docs.openclaw.ai/tools/skills)
- [What are OpenClaw Skills? A 2026 Developer's Guide](https://www.digitalocean.com/resources/articles/what-are-openclaw-skills)
- [OpenClaw Configuration Reference](https://docs.openclaw.ai/gateway/configuration)
- [OpenClaw Custom API Integration Guide](https://lumadock.com/tutorials/openclaw-custom-api-integration-guide)
- [OpenClaw + Robotics Revolution](https://www.openclawrobotics.com/)
