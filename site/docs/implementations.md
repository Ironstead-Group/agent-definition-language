---
id: implementations
title: Implementations
sidebar_position: 102
description: Tools, libraries, and platforms that implement or consume ADL documents.
keywords: [adl, implementations, agentic ai tools, agent validator, agent linter, cli, vscode, ai agent sdk, agent framework]
---

# Implementations

Tools, libraries, and integrations for working with ADL documents. Lint your agents like code.

## Official Tools

### [@adl-spec/core](https://www.npmjs.com/package/@adl-spec/core)

Reference implementation and SDK for ADL. Parse, validate, and convert agent definitions programmatically. Includes full TypeScript types, JSON Schema validation, and converters to A2A Agent Cards and MCP server configurations.

- **Type:** SDK / Library
- **ADL Version:** 0.2.0+
- **License:** Apache-2.0
- **Language:** TypeScript (Bun runtime)
- **Source:** [packages/adl-core](https://github.com/Ironstead-Group/agent-definition-language/tree/main/packages/adl-core)

```typescript
import { parseADL, validateDocument, convertToA2A } from "@adl-spec/core";

const { document } = parseADL(yamlString);
const result = validateDocument(document);
const agentCard = convertToA2A(document);
```

### [@adl-spec/cli](https://www.npmjs.com/package/@adl-spec/cli)

The official command-line tool for ADL. Validate agent definitions against the spec, convert them to A2A Agent Cards or MCP configurations, and scaffold new documents from templates.

- **Type:** Validator / Converter / Scaffolder
- **ADL Version:** 0.2.0+
- **License:** Apache-2.0
- **Language:** TypeScript (Bun runtime)
- **Source:** [packages/adl-cli](https://github.com/Ironstead-Group/agent-definition-language/tree/main/packages/adl-cli)

```bash
# Validate an agent definition
npx @adl-spec/cli validate agent.adl.yaml

# Convert to A2A Agent Card
npx @adl-spec/cli convert agent.adl.yaml --to a2a

# Scaffold a governance-ready definition
npx @adl-spec/cli init --template governance
```

### [@adl-spec/generator](https://www.npmjs.com/package/@adl-spec/generator)

Generate agent code from ADL documents for multiple target frameworks. Transforms ADL definitions into an intermediate representation, then renders deployable code with a pluggable target system.

- **Type:** Code Generator
- **ADL Version:** 0.2.0+
- **License:** Apache-2.0
- **Language:** TypeScript (Bun runtime)
- **Source:** [packages/adl-generator](https://github.com/Ironstead-Group/agent-definition-language/tree/main/packages/adl-generator)
- **Built-in targets:** `claude-sdk-ts`, `vanilla-ts`

```typescript
import { generateAgent, listTargets } from "@adl-spec/generator";

const result = generateAgent(document, { target: "claude-sdk-ts" });
for (const file of result.files) {
  // file.path, file.content — ready to write to disk
}
```

### [@adl-spec/agent](https://www.npmjs.com/package/@adl-spec/agent)

An interactive AI agent that explains ADL concepts through conversation. Built with the ADL core SDK, it validates its own ADL passport on startup — a practical demonstration of ADL in action.

- **Type:** Agent / Demo
- **ADL Version:** 0.2.0+
- **License:** Apache-2.0
- **Language:** TypeScript (Bun runtime)
- **Source:** [packages/adl-agent](https://github.com/Ironstead-Group/agent-definition-language/tree/main/packages/adl-agent)

### [ADL JSON Schema](https://adl-spec.org/0.2/schema.json)

The official JSON Schema for ADL 0.2.0. Use it for validation in any language with a JSON Schema library, or wire it into your editor for autocomplete and inline diagnostics.

- **Type:** Schema
- **ADL Version:** 0.2.0
- **License:** Apache-2.0
- **Source:** [versions/0.2.0/schema.json](https://github.com/Ironstead-Group/agent-definition-language/blob/main/versions/0.2.0/schema.json)

## IDE Support

### VS Code — JSON Schema Validation

Get autocomplete, inline errors, and hover docs for ADL documents in VS Code with zero extensions. Add this to your workspace `.vscode/settings.json`:

```json
{
  "json.schemas": [
    {
      "url": "https://adl-spec.org/0.2/schema.json",
      "fileMatch": ["*.adl.json"]
    }
  ],
  "yaml.schemas": {
    "https://adl-spec.org/0.2/schema.json": "*.adl.yaml"
  }
}
```

- **Type:** IDE Integration
- **ADL Version:** 0.2.0
- **Prerequisites:** For YAML support, install the [YAML extension](https://marketplace.visualstudio.com/items?itemName=redhat.vscode-yaml)

### JetBrains IDEs — JSON Schema Validation

IntelliJ IDEA, WebStorm, and other JetBrains IDEs support JSON Schema mapping natively. Go to **Settings > Languages & Frameworks > Schemas and DTDs > JSON Schema Mappings**, add a new mapping with the schema URL `https://adl-spec.org/0.2/schema.json`, and map it to your `*.adl.json` files.

- **Type:** IDE Integration
- **ADL Version:** 0.2.0

## Adding Your Implementation

Built something with ADL? We want to list it here.

### Requirements

1. Supports ADL 0.2.0 or later
2. Publicly available (open source preferred)
3. Includes documentation for users
4. Actively maintained

### How to Submit

Open a [pull request](https://github.com/Ironstead-Group/agent-definition-language/pulls) adding your implementation to this page. Use this template:

```markdown
### [Tool Name](https://github.com/org/repo)

Brief description of what the tool does.

- **Type:** Validator / Converter / IDE Extension / Runtime / Other
- **ADL Version:** 0.2.0+
- **License:** MIT / Apache-2.0 / etc.
- **Language:** TypeScript / Python / Go / etc.
```
