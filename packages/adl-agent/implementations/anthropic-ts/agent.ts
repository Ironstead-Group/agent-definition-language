/**
 * ADL Explainer Agent — Anthropic SDK (TypeScript) implementation.
 *
 * Uses the @anthropic-ai/sdk package for the Claude API tool-use loop.
 * Tools and knowledge are shared from the parent src/ directory.
 */

export { runAgentTurn, SYSTEM_PROMPT, executeTool } from "../../src/agent.js";
export type { AgentConfig } from "../../src/agent.js";
export { TOOLS } from "../../src/shared.js";
