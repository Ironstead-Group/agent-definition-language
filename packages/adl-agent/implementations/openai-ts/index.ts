#!/usr/bin/env bun
/**
 * ADL Explainer Agent — OpenAI SDK (TypeScript) CLI entry point.
 */

import * as path from "node:path";
import * as readline from "node:readline";
import OpenAI from "openai";
import { loadADLSync, validateDocument } from "@adl-spec/core";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { runAgentTurn, SYSTEM_PROMPT } from "./agent.js";

export { runAgentTurn, SYSTEM_PROMPT, executeTool } from "./agent.js";

function selfCheck(): boolean {
  const passportPath = path.resolve(import.meta.dir, "..", "..", "agent.adl.yaml");
  const { document, errors: loadErrors } = loadADLSync(passportPath);

  if (loadErrors.length > 0) {
    console.error("Self-check FAILED: could not load agent passport.");
    for (const err of loadErrors) {
      console.error(`  [${err.code}] ${err.detail}`);
    }
    return false;
  }

  const { valid, errors: validationErrors } = validateDocument(document!);

  if (!valid) {
    console.error("Self-check FAILED: agent passport has validation errors.");
    for (const err of validationErrors) {
      console.error(`  [${err.code}] ${err.detail}`);
    }
    return false;
  }

  return true;
}

async function main() {
  console.log("Welcome to the ADL Spec Explainer! (OpenAI)");
  console.log("Ask me anything about the Agent Definition Language.");
  console.log('Type "exit" or "quit" to leave.\n');

  // Self-check: validate our own passport
  const ok = selfCheck();
  if (ok) {
    console.log("Self-check passed: agent passport is valid ADL.\n");
  } else {
    console.log(
      "Warning: self-check failed. The agent will still run, but the passport may have issues.\n",
    );
  }

  // Check for API key
  if (!process.env.OPENAI_API_KEY) {
    console.error("Error: OPENAI_API_KEY environment variable is not set.");
    console.error("Set it with: export OPENAI_API_KEY=your-key-here\n");
    process.exit(1);
  }

  const client = new OpenAI();
  const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: SYSTEM_PROMPT },
  ];

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const prompt = () => {
    rl.question("> ", async (input) => {
      const trimmed = input.trim();

      if (!trimmed) {
        prompt();
        return;
      }

      if (trimmed === "exit" || trimmed === "quit") {
        console.log("Goodbye!");
        rl.close();
        return;
      }

      messages.push({ role: "user", content: trimmed });

      try {
        const response = await runAgentTurn(client, messages);
        console.log(`\n${response}\n`);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`\nError: ${message}\n`);
        // Remove the failed user message so conversation stays consistent
        messages.pop();
      }

      prompt();
    });
  };

  prompt();
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
