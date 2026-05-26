/**
 * Code-generation pipeline: ADL Document -> formatter plugin -> output files.
 */

import type { ADLDocument } from "@adl-spec/core";
import type { FormatterExecuteOptions, GenerateResult } from "./plugin.js";
import { executePlugin, listPlugins } from "./plugin.js";

/**
 * Run the generation pipeline for a given ADL document and formatter plugin.
 *
 * @throws {Error} if the plugin/target is not registered
 */
export function generate(
  doc: ADLDocument,
  targetId: string,
  options?: FormatterExecuteOptions,
): GenerateResult {
  try {
    return executePlugin(doc, targetId, options);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.startsWith("Unknown formatter plugin")) {
      throw error;
    }

    const known = listPlugins();
    throw new Error(
      `Unknown target "${targetId}". Available targets: ${known.map((t) => t.id).join(", ") || "(none)"}`,
    );
  }
}

export type { GenerateResult } from "./plugin.js";
