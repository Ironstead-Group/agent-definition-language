# Research: Nvidia NemoClaw

**Date:** 2026-03-21
**Author:** ADL Working Group
**Purpose:** Reference document for ADL interoperability planning

## 1. Overview

NemoClaw is an open-source, enterprise-grade reference stack announced by Nvidia CEO Jensen Huang at GTC 2026 (March 16, 2026). It wraps OpenClaw with security and privacy controls, enabling organizations to run autonomous agents safely.

**Key facts:**
- **License:** Apache 2.0
- **Repository:** github.com/NVIDIA/NemoClaw
- **Status:** Early preview / alpha (not production-ready)
- **Stack:** TypeScript plugin for OpenClaw CLI + Python blueprint orchestrating Nvidia OpenShell runtime
- **Tagline:** "Same agent, different cage"

NemoClaw does not replace OpenClaw — it adds three security layers around it:
1. Kernel-level sandbox (deny-by-default)
2. Out-of-process policy engine (cannot be overridden by compromised agents)
3. Privacy router (intelligent local vs. cloud model routing)

## 2. Architecture

### 2.1 Deployment Model

NemoClaw runs as a **K3s Kubernetes cluster inside a single Docker container** (no separate Kubernetes installation required). It uses versioned blueprints to create sandboxed environments where every network request, file access, and inference call is governed by declarative policy.

### 2.2 Privacy Router

The privacy router is the intelligent routing layer at the core of NemoClaw's data protection:

**How it works:**
1. Intercepts every inference call the agent makes
2. Classifies queries based on data sensitivity and task requirements
3. Routes appropriately:
   - **Restricted data** → Local Nemotron models (data stays on-premises)
   - **Confidential data** → Local preferred; cloud allowed with sanitization/redaction
   - **Public data** → Cloud frontier models (Claude, GPT-4) for cost/performance

**Classification pipeline:**
- Multi-stage inspection: regex pattern matching → ML-based classifiers → Named Entity Recognition (NER)
- Every routing decision is logged for audit compliance

**Example:** A healthcare organization routes patient data (PHI) through local Nemotron while using cloud models for general reasoning — maintaining HIPAA compliance without sacrificing capability.

### 2.3 OpenShell Runtime

OpenShell is the core sandbox and governance runtime with three components:

**1. Kernel-Level Sandbox**
- Uses Linux kernel features: **Landlock**, **seccomp**, **network namespaces**
- Deny-by-default: agents must have explicit permission for every action
- Contrasts with OpenClaw's native permissive model

**2. Out-of-Process Policy Engine**
- Policy enforcement happens outside the agent's trust boundary
- Even fully compromised agents cannot modify their own policies
- Evaluates every action at binary, destination, method, and path levels

**3. Granular Policy Enforcement**
Four control layers:
- **Filesystem:** Which directories the agent can read/write
- **Network:** Which domains/IPs the agent can reach
- **Process:** Which binaries the agent can spawn
- **Inference:** Which models and endpoints are accessible

### 2.4 Nemotron Models

Default deployment uses **Nemotron 3 Super 120B-A12B**:
- **Active parameters:** 12B (120B total, Mixture of Experts)
- **Architecture:** Mamba2-Transformer Hybrid LatentMoE with Multi-Token Prediction
- **Context window:** 1M tokens native
- **Training data:** 25 trillion tokens
- **Quantization:** NVFP4 (Nvidia 4-bit floating point)
- **Capabilities:** Agentic reasoning, chain-of-thought, code generation, RAG, instruction-following
- **Languages:** English, French, German, Italian, Japanese, Spanish, Chinese
- **License:** Commercial use ready

NemoClaw supports hybrid model usage — local Nemotron for sensitive data, cloud frontier models for general tasks.

## 3. Configuration

### 3.1 Blueprint Configuration

NemoClaw is configured via a versioned **`blueprint.yaml`** file:
- Defines the inference profile (which models)
- Sets up OpenShell sandbox parameters
- Specifies privacy routing rules
- Configures guardrail policies
- Ships with Nemotron 3 Super pre-configured

### 3.2 Security Policy Format

Policies are **declarative YAML** (`openclaw-sandbox.yaml`):

```yaml
# Conceptual structure
filesystem:
  allow:
    - path: /workspace
      access: read-write
    - path: /skills
      access: read-only
  deny:
    - path: /etc
    - path: /root

network:
  allow:
    - domain: api.example.com
      ports: [443]
  deny:
    - domain: "*"  # deny-by-default

process:
  allow:
    - binary: /usr/bin/node
    - binary: /usr/bin/python3
  deny:
    - binary: "*"

inference:
  allow:
    - endpoint: local://nemotron
    - endpoint: https://api.anthropic.com
```

**Policy behavior:**
- **Static sections** (filesystem, process) are locked at sandbox creation
- **Dynamic sections** (network, inference) are hot-reloadable on running sandboxes
- Complete audit trail of every action and policy decision

### 3.3 Guardrails (Colang)

NemoClaw uses **Colang**, Nvidia's domain-specific modeling language for guardrails:

```
define user ask_about_patients
  "Tell me about patient records"
  "Show me medical data"

define flow handle_sensitive_request
  user ask_about_patients
  bot inform_privacy_policy
  bot route_to_local_model

define bot inform_privacy_policy
  "This request involves sensitive data. Routing through secure local processing."
```

**Guardrail types:**
- **Input rails:** Filter/validate incoming messages
- **Output rails:** Validate agent responses before delivery
- **Topical rails:** Keep conversations within approved boundaries
- **Security rails:** Detect and block jailbreak attempts, prompt injection, data exfiltration

Integrates Nvidia's **NeMo Guardrails** framework (open-source since 2023).

## 4. Installation

### 4.1 Quick Start

```bash
curl -fsSL https://www.nvidia.com/nemoclaw.sh | bash
```

The installer:
1. Detects and installs Node.js if needed
2. Launches an interactive onboard wizard
3. Creates the sandbox environment
4. Configures inference settings
5. Applies security policies
6. Validates system prerequisites

### 4.2 System Requirements

| Requirement | Minimum |
|------------|---------|
| **OS** | Linux only |
| **RAM** | 8 GB (swap recommended for <8 GB) |
| **Disk** | 20 GB free (sandbox image ~2.4 GB compressed) |
| **Container** | Docker with proper user permissions |
| **cgroup** | v2 with `"default-cgroupns-mode": "host"` on Ubuntu 24.04/WSL2 |
| **GPU** | Nvidia GPU required for local inference (RTX 30/40+ series) |
| **Prerequisite** | OpenClaw must already be installed |

### 4.3 Deployment Options

1. **Local:** GeForce RTX PCs, RTX PRO workstations, DGX Station/Spark. Supports offline operation.
2. **Cloud:** Remote GPU instances via Brev, Nvidia cloud, DigitalOcean. Always-on agent execution.
3. **Hybrid/Edge:** Local Nemotron for sensitive data + cloud models for general tasks. Privacy router handles automatic classification and routing.

## 5. Relationship to ADL

### 5.1 Alignment Points

NemoClaw's architecture has strong parallels with ADL concepts:

| NemoClaw Component | ADL Equivalent | Alignment Quality |
|-------------------|---------------|-------------------|
| Deny-by-default sandbox | `permissions` (deny-by-default model) | **Strong** — same philosophy, different enforcement layer |
| Privacy router sensitivity classification | `data_classification.sensitivity` | **Strong** — both use sensitivity-based routing/handling |
| Policy engine (filesystem, network, process) | `permissions` (filesystem, network, execution domains) | **Strong** — nearly 1:1 domain mapping |
| Colang guardrails | `security` + governance profile | **Moderate** — ADL declares requirements, NemoClaw enforces |
| Audit trail | `security.attestation` | **Moderate** — ADL attests, NemoClaw logs |
| Blueprint versioning | `lifecycle` + `version` | **Weak** — NemoClaw versions blueprints, not agents |

### 5.2 ADL Value-Add to NemoClaw

ADL provides capabilities NemoClaw lacks:
- **Agent identity** — NemoClaw inherits OpenClaw's informal naming; ADL provides globally unique, cryptographically verifiable identity
- **Lifecycle management** — No agent lifecycle in NemoClaw; ADL adds draft/active/deprecated/retired
- **Discovery** — No standardized discovery; ADL provides `/.well-known/adl-agents`
- **Compliance declaration** — NemoClaw enforces policies but has no standard way to declare compliance posture; ADL's governance profile fills this gap
- **Cross-platform portability** — NemoClaw configs are Nvidia-specific; ADL documents are vendor-neutral

### 5.3 NemoClaw Value-Add to ADL

NemoClaw provides enforcement capabilities ADL lacks:
- **Runtime enforcement** — ADL declares permissions; NemoClaw enforces them at the kernel level
- **Privacy routing** — ADL classifies sensitivity; NemoClaw actually routes inference calls based on it
- **Sandbox isolation** — ADL specifies resource limits; NemoClaw enforces them via containers and cgroups
- **Guardrail execution** — ADL's governance profile declares autonomy tiers; NemoClaw's Colang rails implement them

The combination is **declaration (ADL) + enforcement (NemoClaw)** — a natural split.

## 6. Nvidia's Broader Agent Strategy

### 6.1 GTC 2026 Announcements

- Jensen Huang: "Every company should have an OpenClaw strategy"
- NemoClaw positioned as solving OpenClaw's biggest gap (security)
- "Build-a-Claw" workshops at GTC Park (March 16–19, 2026)
- Robot Olaf demo: humanoid robot controlled via NemoClaw agents
- $1 trillion AI vision: agents reshaping knowledge work across industries

### 6.2 Nvidia Agent Portfolio

| Product | Role |
|---------|------|
| **OpenClaw** | Open-source agent framework (community-driven) |
| **NemoClaw** | Enterprise security/privacy wrapper |
| **OpenShell** | Sandbox runtime for agent isolation |
| **Nemotron** | Open-weight models for agentic reasoning |
| **NeMo** | Full AI lifecycle management platform |
| **NIM** | Optimized inference microservices |
| **Nvidia Agent Toolkit** | Umbrella for all agent infrastructure |

### 6.3 Partner Ecosystem

- **CrowdStrike:** "Secure-by-Design AI Blueprint for AI Agents" collaboration
- **EQTY Lab:** Verifiable runtime across OpenShell and Nvidia Enterprise AI Factory
- **JetPatch** and others: Guardrail products for NemoClaw

## References

- [Nvidia NemoClaw Announcement](https://nvidianews.nvidia.com/news/nvidia-announces-nemoclaw)
- [Nvidia NemoClaw Product Page](https://www.nvidia.com/en-us/ai/nemoclaw/)
- [NemoClaw GitHub](https://github.com/NVIDIA/NemoClaw)
- [NemoClaw Quickstart](https://docs.nvidia.com/nemoclaw/latest/get-started/quickstart.html)
- [NemoClaw: OpenClaw Gets Enterprise Security (GTC 2026)](https://particula.tech/blog/nvidia-nemoclaw-openclaw-enterprise-security)
- [Nvidia's NemoClaw — Security for OpenClaw | TechCrunch](https://techcrunch.com/2026/03/16/nvidias-version-of-openclaw-could-solve-its-biggest-problem-security/)
- [NemoClaw vs OpenClaw: What's the Difference?](https://www.secondtalent.com/resources/nemoclaw-vs-openclaw/)
- [Nvidia NemoClaw Privacy Router](https://till-freitag.com/en/blog/nemoclaw-privacy-router)
- [OpenShell — Safer Autonomous Agents | Nvidia Blog](https://developer.nvidia.com/blog/run-autonomous-self-evolving-agents-more-safely-with-nvidia-openshell/)
- [Nemotron 3 Super | Nvidia Blog](https://developer.nvidia.com/blog/introducing-nemotron-3-super-an-open-hybrid-mamba-transformer-moe-for-agentic-reasoning/)
- [NeMo Guardrails — Colang Guide](https://docs.nvidia.com/nemo/guardrails/latest/configure-rails/colang/index.html)
- [CrowdStrike + Nvidia AI Blueprint](https://www.crowdstrike.com/en-us/press-releases/crowdstrike-nvidia-unveil-secure-by-design-ai-blueprint-for-ai-agents/)
- [GTC 2026 — Nvidia Blog](https://blogs.nvidia.com/blog/gtc-2026-news/)
