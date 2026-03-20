/**
 * ADL Explainer Agent — Google Generative AI SDK (TypeScript) implementation.
 *
 * Uses the `@google/generative-ai` package for the Gemini tool-use loop.
 * Tools and knowledge are shared from the parent src/ directory.
 */

import type {
  ChatSession,
  FunctionDeclaration,
  FunctionDeclarationSchema,
  GenerateContentResult,
  GenerativeModel,
  Part,
  Tool,
} from "@google/generative-ai";
import { SchemaType } from "@google/generative-ai";
import { SYSTEM_PROMPT, TOOLS, executeTool, type ToolDefinition } from "../../src/shared.js";

// Re-export shared items for consumers of this implementation
export { SYSTEM_PROMPT, TOOLS, executeTool };

/**
 * Map a JSON Schema type string to Gemini SchemaType enum.
 */
function toGeminiType(jsonType: string): SchemaType {
  switch (jsonType) {
    case "string":
      return SchemaType.STRING;
    case "number":
      return SchemaType.NUMBER;
    case "integer":
      return SchemaType.INTEGER;
    case "boolean":
      return SchemaType.BOOLEAN;
    case "array":
      return SchemaType.ARRAY;
    case "object":
      return SchemaType.OBJECT;
    default:
      return SchemaType.STRING;
  }
}

/**
 * Convert a shared ToolDefinition's parameter properties to Gemini schema format.
 */
function toGeminiParameters(tool: ToolDefinition): FunctionDeclarationSchema {
  const properties: Record<string, { type: SchemaType; description?: string; enum?: string[] }> = {};

  for (const [key, value] of Object.entries(tool.parameters.properties)) {
    const prop = value as { type: string; description?: string; enum?: string[] };
    const geminiProp: { type: SchemaType; description?: string; enum?: string[] } = {
      type: toGeminiType(prop.type),
    };
    if (prop.description) {
      geminiProp.description = prop.description;
    }
    if (prop.enum) {
      geminiProp.enum = prop.enum;
    }
    properties[key] = geminiProp;
  }

  return {
    type: SchemaType.OBJECT,
    properties,
    required: tool.parameters.required,
  } as FunctionDeclarationSchema;
}

/**
 * Map shared ToolDefinitions to Gemini tool format.
 */
function toGeminiTools(tools: ToolDefinition[]): Tool[] {
  const functionDeclarations: FunctionDeclaration[] = tools.map((t) => ({
    name: t.name,
    description: t.description,
    parameters: toGeminiParameters(t),
  }));

  return [{ functionDeclarations }];
}

export const GEMINI_TOOLS = toGeminiTools(TOOLS);

export interface AgentConfig {
  maxOutputTokens?: number;
}

/**
 * Check if a GenerateContentResult has function call parts.
 */
function getFunctionCalls(result: GenerateContentResult): Array<{ name: string; args: Record<string, unknown> }> {
  const calls: Array<{ name: string; args: Record<string, unknown> }> = [];

  for (const candidate of result.response.candidates ?? []) {
    for (const part of candidate.content.parts) {
      if (part.functionCall) {
        calls.push({
          name: part.functionCall.name,
          args: (part.functionCall.args ?? {}) as Record<string, unknown>,
        });
      }
    }
  }

  return calls;
}

/**
 * Extract final text from a GenerateContentResult.
 */
function getTextContent(result: GenerateContentResult): string {
  const texts: string[] = [];

  for (const candidate of result.response.candidates ?? []) {
    for (const part of candidate.content.parts) {
      if (part.text) {
        texts.push(part.text);
      }
    }
  }

  return texts.join("\n");
}

/**
 * Run a single turn of the agent — send a message, handle tool calls, return the final text.
 */
export async function runAgentTurn(
  model: GenerativeModel,
  chat: ChatSession,
  userMessage: string,
  config?: AgentConfig,
): Promise<string> {
  let result = await chat.sendMessage(userMessage);
  let functionCalls = getFunctionCalls(result);

  while (functionCalls.length > 0) {
    // Execute each function call and build response parts
    const responseParts: Part[] = functionCalls.map((call) => {
      const toolResult = executeTool(call.name, call.args);
      return {
        functionResponse: {
          name: call.name,
          response: { result: JSON.parse(toolResult) },
        },
      };
    });

    // Send function responses back
    result = await chat.sendMessage(responseParts);
    functionCalls = getFunctionCalls(result);
  }

  return getTextContent(result);
}
