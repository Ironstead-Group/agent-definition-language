/**
 * Shared tool registry and types — used by all TypeScript implementations.
 *
 * This module provides:
 * 1. SYSTEM_PROMPT — the agent's system prompt (shared across all impls)
 * 2. TOOLS — tool metadata (name, description, input schema)
 * 3. executeTool() — dispatch a tool call to the correct handler
 *
 * Each SDK-specific implementation imports these and wires them into its
 * own agent loop.
 */

import { explainConcept } from "./tools/explain-concept.js";
import { validateDocumentTool } from "./tools/validate-document.js";
import { showExample } from "./tools/show-example.js";
import { getSpecSection } from "./tools/get-spec-section.js";
import { compareFormats } from "./tools/compare-formats.js";

export const SYSTEM_PROMPT = `You are the ADL Spec Explainer, an expert on the Agent Definition Language (ADL).

You help users:
- Understand ADL concepts (the passport model, tools, permissions, data classification, profiles, lifecycle, security, extensions)
- Validate their ADL documents and explain any errors in plain language
- Explore example ADL documents
- Navigate the ADL specification
- Compare ADL with other agent description formats (A2A, MCP, OpenAPI, Agent Protocol)

Always be clear, accurate, and helpful. When explaining validation errors, provide actionable guidance on how to fix them. Use the available tools to look up information rather than relying on memory alone.

ADL documents are YAML or JSON files that describe AI agents — like a passport that travels with the agent, declaring its identity, capabilities, permissions, and trust signals.`;

/**
 * Tool metadata — framework-agnostic definition of each tool.
 * Each SDK implementation maps this to its own tool format.
 */
export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, unknown>;
    required: string[];
  };
}

export const TOOLS: ToolDefinition[] = [
  {
    name: "explain_concept",
    description:
      "Explain an ADL concept such as the passport model, tools, permissions, data classification, profiles, lifecycle, security, or extensions.",
    parameters: {
      type: "object",
      properties: {
        concept: {
          type: "string",
          description: "The ADL concept to explain",
        },
      },
      required: ["concept"],
    },
  },
  {
    name: "validate_document",
    description:
      "Validate an ADL document provided as YAML or JSON and return structured results with errors explained in plain language.",
    parameters: {
      type: "object",
      properties: {
        document: {
          type: "string",
          description: "The ADL document content as YAML or JSON string",
        },
      },
      required: ["document"],
    },
  },
  {
    name: "show_example",
    description:
      "Return an example ADL document by category: minimal, production, or with-tools.",
    parameters: {
      type: "object",
      properties: {
        category: {
          type: "string",
          enum: ["minimal", "production", "with-tools"],
          description: "The example category to retrieve",
        },
      },
      required: ["category"],
    },
  },
  {
    name: "get_spec_section",
    description:
      "Retrieve information about a specific section of the ADL specification.",
    parameters: {
      type: "object",
      properties: {
        section: {
          type: "string",
          description: "The spec section or topic to look up",
        },
      },
      required: ["section"],
    },
  },
  {
    name: "compare_formats",
    description:
      "Compare ADL with another agent description format such as A2A, MCP, OpenAPI, or Agent Protocol.",
    parameters: {
      type: "object",
      properties: {
        format: {
          type: "string",
          enum: ["a2a", "mcp", "openapi", "agent_protocol"],
          description: "The format to compare against ADL",
        },
      },
      required: ["format"],
    },
  },
];

/**
 * Execute a tool by name and return the result as a JSON string.
 * Shared by all TypeScript implementations.
 */
export function executeTool(
  name: string,
  input: Record<string, unknown>,
): string {
  switch (name) {
    case "explain_concept":
      return JSON.stringify(
        explainConcept({ concept: input.concept as string }),
      );
    case "validate_document":
      return JSON.stringify(
        validateDocumentTool({ document: input.document as string }),
      );
    case "show_example":
      return JSON.stringify(
        showExample({ category: input.category as string }),
      );
    case "get_spec_section":
      return JSON.stringify(
        getSpecSection({ section: input.section as string }),
      );
    case "compare_formats":
      return JSON.stringify(
        compareFormats({ format: input.format as string }),
      );
    default:
      return JSON.stringify({ error: `Unknown tool: ${name}` });
  }
}
