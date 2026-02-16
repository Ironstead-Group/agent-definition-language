---
id: capabilities
title: 8. Capabilities
sidebar_position: 8
description: Define agent capabilities including tools, resources, and prompts that extend agent functionality.
keywords: [adl, capabilities, tools, resources, prompts, function calling]
---

import CodeTabs from '@site/src/components/CodeTabs';
import toolExample from '@site/_yaml-sources/snippets/capabilities/tool-example.yaml';
import toolExampleJson from '@site/_yaml-sources/snippets/capabilities/tool-example.json';
import resourceExample from '@site/_yaml-sources/snippets/capabilities/resource-example.yaml';
import resourceExampleJson from '@site/_yaml-sources/snippets/capabilities/resource-example.json';
import promptExample from '@site/_yaml-sources/snippets/capabilities/prompt-example.yaml';
import promptExampleJson from '@site/_yaml-sources/snippets/capabilities/prompt-example.json';

# Capabilities

This section defines the three capability types that agents can declare: **tools** (functions), **resources** (data sources), and **prompts** (templates).

## 8.1 tools

Array of tool objects (functions the agent can invoke). **OPTIONAL.** Each tool **MUST** contain `name` (string, REQUIRED) and `description` (string, REQUIRED). Each tool **MAY** contain: `parameters` (JSON Schema), `returns` (JSON Schema), `examples`, `requires_confirmation` (bool), `idempotent` (bool), `read_only` (bool), `annotations`. Tool names **MUST** be unique and match `^[a-z][a-z0-9_]*$`. The `parameters` and `returns` objects, when present, **MUST** be valid JSON Schema.

### Example Tool Definition

<CodeTabs yaml={toolExample} json={toolExampleJson} title="tool-with-read-only" />

:::tip Tool Flags
- `read_only: true` - Tool does not modify state (safer, can run without confirmation)
- `idempotent: true` - Tool can be safely retried on failure
- `requires_confirmation: true` - Runtime should prompt user before execution
:::

## 8.2 resources

Array of resource objects (data sources the agent can access). **OPTIONAL.** Each resource **MUST** contain `name` (string, REQUIRED) and `type` (string, REQUIRED). `type` **MUST** be one of: `vector_store`, `knowledge_base`, `file`, `api`, `database`. Each resource **MAY** contain: `description`, `uri`, `mime_types`, `schema`, `annotations`. Resource names **MUST** be unique.

### Example Resource Definition

<CodeTabs yaml={resourceExample} json={resourceExampleJson} />

## 8.3 prompts

Array of prompt objects (reusable prompt templates). **OPTIONAL.** Each prompt **MUST** contain `name` (string, REQUIRED) and `template` (string, REQUIRED). Each prompt **MAY** contain `description`, `arguments` (JSON Schema). Template arguments use `{{argument_name}}`. Prompt names **MUST** be unique.

### Example Prompt Definition

<CodeTabs yaml={promptExample} json={promptExampleJson} />
