---
id: with-tools
title: Agent with Tools
sidebar_position: 3
description: A calculator agent demonstrating ADL tool definitions with parameters and return types.
keywords: [adl, tools, example, function calling, calculator]
---

import CodeTabs from '@site/src/components/CodeTabs';
import calculatorYaml from '@site/_yaml-sources/examples/with-tools.yaml';
import calculatorJson from '@site/_yaml-sources/examples/with-tools.json';
import modelYaml from '@site/_yaml-sources/snippets/with-tools/model.yaml';
import modelJson from '@site/_yaml-sources/snippets/with-tools/model.json';
import metadataYaml from '@site/_yaml-sources/snippets/with-tools/metadata.yaml';
import metadataJson from '@site/_yaml-sources/snippets/with-tools/metadata.json';

# Agent with Tools Example

This example demonstrates an agent with tool definitions - a calculator that can perform math operations.

:::tip Tool Design
Tools should be atomic, well-documented, and have clear parameter schemas. Mark read-only tools appropriately to enable safer execution.
:::

## Document

<CodeTabs yaml={calculatorYaml} json={calculatorJson} title="calculator.adl" />

## Key Features

### Model Configuration

<CodeTabs yaml={modelYaml} json={modelJson} />

This declares that the agent requires a model with function calling capability.

### Tool Definitions

Each tool includes:

| Field | Purpose |
|-------|---------|
| `name` | Unique identifier for the tool (must match `^[a-z][a-z0-9_]*$`) |
| `description` | Human-readable description of what the tool does |
| `parameters` | JSON Schema defining the input parameters |
| `returns` | JSON Schema defining the return value |
| `read_only` | Indicates the tool doesn't modify state |
| `idempotent` | Indicates the tool can be safely retried |

### Metadata

<CodeTabs yaml={metadataYaml} json={metadataJson} />

Provides additional context about the agent for discovery and licensing.

## Notes

:::note Implementation Guidance
- Tool names must be unique within the document
- The `parameters` and `returns` fields use JSON Schema
- `read_only` tools are generally safer and can be executed without confirmation
- `idempotent` tools can be safely retried on failure
:::

## Next Steps

Ready to build a production-ready agent? See [Production Agent](/examples/production) for a complete example with identity, permissions, security, and more.
