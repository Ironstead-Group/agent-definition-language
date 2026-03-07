---
id: overview
title: Overview
sidebar_position: 1
description: The Portfolio Profile extends ADL with agent inventory, relationships, and domain membership for managing agent portfolios at scale.
keywords: [adl, portfolio, inventory, relationships, domain, catalog, ddd]
---

# Portfolio Profile

<div className="profile-badge">

| | |
|---|---|
| **Identifier** | `urn:adl:profile:portfolio:1.0` |
| **Status** | Draft |
| **ADL Compatibility** | 0.1.x |

</div>

:::info Profile Status
This profile is in **draft** status. The specification is stable for early adoption, but minor changes may occur before 1.0.
:::

## Overview

The Portfolio Profile extends ADL with inventory, relationships, and domain membership capabilities. It enables organizations to manage agent portfolios at scale, track agent dependencies, and align agents with business domains using Domain-Driven Design (DDD) concepts.

## Use Cases

- Enterprise agent catalog and inventory management
- Agent dependency tracking and impact analysis
- Orchestrator-to-sub-agent composition mapping
- Domain-driven agent organization (bounded contexts, subdomains)
- Agent discovery and visibility control
- Deployment order determination

## Quick Start

Add the Portfolio Profile to your ADL document:

```json
{
  "adl_spec": "0.1.0",
  "name": "Customer Service Agent",
  "description": "Handles customer inquiries and support requests.",
  "version": "1.0.0",
  "profiles": ["urn:adl:profile:portfolio:1.0"],
  "inventory": {
    "catalog_id": "cs-agent-001",
    "classification": {
      "category": "support",
      "type": "conversational"
    },
    "tags": ["customer-service", "support", "tier-1"],
    "visibility": "internal"
  }
}
```

## Additional Members

The Portfolio Profile adds the following top-level members:

| Member | Required | Description |
|--------|----------|-------------|
| `inventory` | **REQUIRED** | Agent catalog and inventory information |
| `relationships` | Optional | Agent dependencies and composition relationships |
| `domain` | Optional | Business/functional domain membership (DDD-aligned) |

See the [full specification](./specification) for detailed member definitions.

## Key Concepts

### Inventory Management
The `inventory` member provides catalog identifiers, classification, tags, and visibility controls. This enables agent registries to index, search, and filter agents across the organization.

### Relationship Tracking
The `relationships` member models agent dependencies (`depends_on`), orchestration hierarchies (`composed_of`, `orchestrated_by`), and peer collaborations (`peers`). This enables deployment ordering, impact analysis, and relationship visualization.

### Domain Alignment
The `domain` member aligns agents with business capabilities using DDD concepts: domain identifiers, subdomains, bounded contexts, and roles within domains.
