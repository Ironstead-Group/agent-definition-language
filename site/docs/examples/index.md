---
id: index
title: Examples
sidebar_position: 1
slug: /examples
description: Example ADL documents demonstrating minimal, intermediate, and production-ready agent definitions.
keywords: [adl, examples, json, agent definition]
---

# Examples

This section contains example Agent Definition Language (ADL) documents. They illustrate the specification and can be used to validate tooling.

:::tip Start Here
New to ADL? Start with the [Minimal Example](/examples/minimal) to understand the required fields, then explore the [Production Example](/examples/production) for a complete implementation.
:::

## Example Index

| Example | Description |
|---------|-------------|
| [Minimal](/examples/minimal) | Minimal valid ADL document with only required fields |
| [With Tools](/examples/with-tools) | Calculator agent demonstrating tool definitions |
| [Production](/examples/production) | Full production-style agent with all features |

## Conventions

- Examples are valid against the ADL version they target
- **ADL 0.1.0:** JSON format with `adl_spec`, `name`, `description`, `version` (snake_case)

## Quick Reference

The minimal valid ADL document:

```json title="minimal-agent.adl.json"
{
  "adl_spec": "0.1.0",
  "name": "Hello Agent",
  "description": "A simple greeting agent.",
  "version": "1.0.0"
}
```

:::info File Extension
ADL documents use the `.adl.json` or `.adl` file extension. The media type is `application/adl+json`.
:::

## Contributing Examples

New examples are welcome! To contribute:

1. Ensure the example conforms to the target spec version
2. Add clear comments explaining the example's purpose
3. Submit a PR with the example

See the [Contributing Guide](/contributing) for more information.
