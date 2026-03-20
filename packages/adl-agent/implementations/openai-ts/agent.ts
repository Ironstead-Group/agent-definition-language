/**
 * ADL Explainer Agent — OpenAI SDK (TypeScript) implementation.
 *
 * Uses the `openai` npm package for the GPT tool-use loop.
 * Tools and knowledge are shared from the parent src/ directory.
 */

import OpenAI from "openai";
import type { ChatCompletionMessageParam, ChatCompletionTool } from "openai/resources/chat/completions";
import { SYSTEM_PROMPT, TOOLS, executeTool, type ToolDefinition } from "../../src/shared.js";

// Re-export shared items for consumers of this implementation
export { SYSTEM_PROMPT, TOOLS, executeTool };

/**
 * Map shared ToolDefinitions to OpenAI API tool format.
 */
function toOpenAITools(tools: ToolDefinition[]): ChatCompletionTool[] {
  return tools.map((t) => ({
    type: "function" as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: {
        type: t.parameters.type,
        properties: t.parameters.properties,
        required: t.parameters.required,
      },
    },
  }));
}

const OPENAI_TOOLS = toOpenAITools(TOOLS);

export interface AgentConfig {
  model?: string;
  maxTokens?: number;
}

/**
 * Run a single turn of the agent — send a message, handle tool calls, return the final text.
 */
export async function runAgentTurn(
  client: OpenAI,
  messages: ChatCompletionMessageParam[],
  config?: AgentConfig,
): Promise<string> {
  const model = config?.model ?? "gpt-4o";
  const maxTokens = config?.maxTokens ?? 4096;

  let response = await client.chat.completions.create({
    model,
    max_tokens: maxTokens,
    messages,
    tools: OPENAI_TOOLS,
    tool_choice: "auto",
  });

  let choice = response.choices[0];

  while (choice.finish_reason === "tool_calls" && choice.message.tool_calls) {
    // Append assistant message with tool calls
    messages.push(choice.message);

    // Execute each tool call and append results
    for (const toolCall of choice.message.tool_calls) {
      const result = executeTool(
        toolCall.function.name,
        JSON.parse(toolCall.function.arguments),
      );

      messages.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: result,
      });
    }

    // Continue the conversation
    response = await client.chat.completions.create({
      model,
      max_tokens: maxTokens,
      messages,
      tools: OPENAI_TOOLS,
      tool_choice: "auto",
    });

    choice = response.choices[0];
  }

  // Append final assistant message
  messages.push(choice.message);

  return choice.message.content ?? "";
}
