/**
 * Agent core — Anthropic SDK agent loop.
 * Re-exports shared tools/system prompt and provides the Anthropic-specific agent turn.
 */

import Anthropic from "@anthropic-ai/sdk";
import type {
  MessageParam,
  ToolResultBlockParam,
} from "@anthropic-ai/sdk/resources/messages";
import { SYSTEM_PROMPT, TOOLS, executeTool, type ToolDefinition } from "./shared.js";

// Re-export for backward compatibility
export { SYSTEM_PROMPT, TOOLS as TOOL_DEFINITIONS, executeTool };

/**
 * Map shared ToolDefinitions to Anthropic API Tool format.
 */
function toAnthropicTools(tools: ToolDefinition[]): Anthropic.Tool[] {
  return tools.map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: {
      type: "object" as const,
      properties: t.parameters.properties,
      required: t.parameters.required,
    },
  }));
}

const ANTHROPIC_TOOLS = toAnthropicTools(TOOLS);

export interface AgentConfig {
  model?: string;
  maxTokens?: number;
}

/**
 * Run a single turn of the agent — send a message, handle tool calls, return the final text.
 */
export async function runAgentTurn(
  client: Anthropic,
  messages: MessageParam[],
  config?: AgentConfig,
): Promise<string> {
  const model = config?.model ?? "claude-sonnet-4-20250514";
  const maxTokens = config?.maxTokens ?? 4096;

  let response = await client.messages.create({
    model,
    max_tokens: maxTokens,
    system: SYSTEM_PROMPT,
    tools: ANTHROPIC_TOOLS,
    messages,
  });

  while (response.stop_reason === "tool_use") {
    const toolUseBlocks = response.content.filter(
      (block): block is Anthropic.Messages.ToolUseBlock =>
        block.type === "tool_use",
    );

    messages.push({ role: "assistant", content: response.content });

    const toolResults: ToolResultBlockParam[] = toolUseBlocks.map((block) => ({
      type: "tool_result" as const,
      tool_use_id: block.id,
      content: executeTool(block.name, block.input as Record<string, unknown>),
    }));

    messages.push({ role: "user", content: toolResults });

    response = await client.messages.create({
      model,
      max_tokens: maxTokens,
      system: SYSTEM_PROMPT,
      tools: ANTHROPIC_TOOLS,
      messages,
    });
  }

  messages.push({ role: "assistant", content: response.content });

  const textBlocks = response.content.filter(
    (block): block is Anthropic.Messages.TextBlock => block.type === "text",
  );

  return textBlocks.map((block) => block.text).join("\n");
}
