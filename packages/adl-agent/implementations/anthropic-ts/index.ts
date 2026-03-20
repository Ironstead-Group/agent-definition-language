#!/usr/bin/env bun
/**
 * ADL Explainer Agent — Anthropic SDK (TypeScript) CLI entry point.
 */

export { runAgentTurn, SYSTEM_PROMPT, executeTool } from "./agent.js";

// When run directly, start the interactive CLI
if (import.meta.main) {
  const { default: mainModule } = await import("../../src/index.js");
}
