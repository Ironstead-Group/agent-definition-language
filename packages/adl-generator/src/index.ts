/**
 * @adl-spec/generator — Generate agent code from ADL passports.
 */

import type { ADLDocument } from "@adl-spec/core";
import { generate, type GenerateResult } from "./generator.js";
import type { GeneratedFile } from "./renderer.js";
import {
  registerTarget,
  listTargets as listRegisteredTargets,
} from "./renderer.js";

// Register built-in targets on module load
import { ClaudeSdkTsRenderer } from "./targets/claude-sdk-ts/index.js";
import { VanillaTsRenderer } from "./targets/vanilla-ts/index.js";

registerTarget(new ClaudeSdkTsRenderer());
registerTarget(new VanillaTsRenderer());

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface GenerateOptions {
  /** Target renderer id (e.g. "claude-sdk-ts", "vanilla-ts"). */
  target: string;
}

/**
 * Generate agent code from an ADL document for a specific target framework.
 */
export function generateAgent(
  doc: ADLDocument,
  options: GenerateOptions,
): GenerateResult {
  return generate(doc, options.target);
}

/**
 * List all registered code-generation targets.
 */
export function listTargets(): Array<{
  id: string;
  label: string;
  outputLanguage: string;
}> {
  return listRegisteredTargets().map((t) => ({
    id: t.id,
    label: t.label,
    outputLanguage: t.outputLanguage,
  }));
}

// Re-exports
export type { GenerateResult } from "./generator.js";
export type { GeneratedFile, TargetRenderer } from "./renderer.js";
export { registerTarget } from "./renderer.js";
export type {
  AgentIR,
  ToolIR,
  ResourceIR,
  PermissionsIR,
  SecurityIR,
  RuntimeIR,
  DataClassificationIR,
  LifecycleIR,
} from "./ir/types.js";
export { transformToIR } from "./ir/transform.js";
