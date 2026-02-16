---
id: appendix-schema
title: Appendix A. JSON Schema
sidebar_position: 20
description: The normative JSON Schema for validating ADL documents.
keywords: [adl, json schema, validation, schema]
---

# Appendix A. JSON Schema

The normative JSON Schema for ADL is available at `https://adl-spec.org/0.1/schema.json` (JSON Schema Draft 2020-12).

:::tip IDE Integration
Reference the schema in your ADL documents using the `$schema` field to enable IDE validation and autocomplete:
```json
{
  "$schema": "https://adl-spec.org/0.1/schema.json",
  "adl": "0.1.0",
  ...
}
```
:::

## Minimal Schema

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://adl-spec.org/0.1/schema.json",
  "title": "ADL Document",
  "description": "Agent Definition Language document schema",
  "type": "object",
  "required": ["adl", "name", "description", "version"],
  "properties": {
    "$schema": {
      "type": "string",
      "format": "uri"
    },
    "adl": {
      "type": "string",
      "pattern": "^\\d+\\.\\d+\\.\\d+$",
      "description": "ADL specification version"
    },
    "name": {
      "type": "string",
      "minLength": 1,
      "description": "Human-readable agent name"
    },
    "description": {
      "type": "string",
      "minLength": 1,
      "description": "Agent description"
    },
    "version": {
      "type": "string",
      "pattern": "^\\d+\\.\\d+\\.\\d+$",
      "description": "Agent version (SemVer)"
    },
    "id": {
      "type": "string",
      "description": "Unique agent identifier (URI/URN)"
    },
    "provider": {
      "type": "object",
      "properties": {
        "name": { "type": "string" },
        "url": { "type": "string", "format": "uri" },
        "contact": { "type": "string", "format": "email" }
      },
      "required": ["name"]
    },
    "tools": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["name", "description"],
        "properties": {
          "name": { "type": "string", "pattern": "^[a-z][a-z0-9_]*$" },
          "description": { "type": "string" },
          "parameters": { "type": "object" },
          "returns": { "type": "object" },
          "requires_confirmation": { "type": "boolean" },
          "idempotent": { "type": "boolean" },
          "read_only": { "type": "boolean" }
        }
      }
    },
    "resources": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["name", "type"],
        "properties": {
          "name": { "type": "string" },
          "type": {
            "type": "string",
            "enum": ["vector_store", "knowledge_base", "file", "api", "database"]
          },
          "description": { "type": "string" },
          "uri": { "type": "string" }
        }
      }
    },
    "prompts": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["name", "template"],
        "properties": {
          "name": { "type": "string" },
          "template": { "type": "string" },
          "description": { "type": "string" }
        }
      }
    },
    "profiles": {
      "type": "array",
      "items": { "type": "string" }
    }
  }
}
```

See the full schema in the [repository](https://github.com/adl-spec/agent-definition-language/blob/main/versions/0.1.0/schema.json).
