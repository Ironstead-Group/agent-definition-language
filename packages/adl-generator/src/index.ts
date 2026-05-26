/**
 * @adl-spec/generator — Generate agent code from ADL passports.
 */

import type { ADLDocument } from "@adl-spec/core";
import { generate, type GenerateResult } from "./generator.js";
import type { GeneratedFile } from "./renderer.js";
import { registerPlugin, listPlugins as listRegisteredPlugins } from "./plugin.js";
import {
  registerTarget,
  listTargets as listRegisteredTargets,
} from "./renderer.js";

// Register built-in formatter plugins on module load
import {
  ClaudeSdkTsRenderer,
  claudeSdkTsPlugin,
} from "./targets/claude-sdk-ts/index.js";
import {
  LangGraphTsRenderer,
  langGraphTsPlugin,
} from "./targets/langgraph-ts/index.js";
import {
  VanillaTsRenderer,
  vanillaTsPlugin,
} from "./targets/vanilla-ts/index.js";

registerPlugin(claudeSdkTsPlugin);
registerPlugin(langGraphTsPlugin);
registerPlugin(vanillaTsPlugin);

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
 * Execute a formatter plugin directly by id.
 */
export function executeFormatter(
  doc: ADLDocument,
  formatterId: string,
): GenerateResult {
  return generate(doc, formatterId);
}

/**
 * List all registered formatter plugins.
 */
export function listPlugins(): Array<{
  id: string;
  label: string;
  outputLanguage: string;
}> {
  return listRegisteredPlugins().map((plugin) => ({
    id: plugin.id,
    label: plugin.label,
    outputLanguage: plugin.outputLanguage,
  }));
}

/**
 * List all registered code-generation targets.
 *
 * @deprecated Use listPlugins().
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

export const builtinPlugins = {
  claudeSdkTs: claudeSdkTsPlugin,
  langGraphTs: langGraphTsPlugin,
  vanillaTs: vanillaTsPlugin,
} as const;

// Re-exports
export type { GenerateResult } from "./generator.js";
export type { GeneratedFile, TargetRenderer } from "./renderer.js";
export { registerTarget } from "./renderer.js";
export type {
  FormatterExecuteOptions,
  FormatterPlugin,
  FormatterPluginDefinition,
  FormatterRenderContext,
} from "./plugin.js";
export {
  defineFormatterPlugin,
  executePlugin,
  getPlugin,
  isFormatterPlugin,
  isFormatterPluginDefinition,
  registerPlugin,
} from "./plugin.js";
export { loadFormatterPlugins } from "./plugin-loader.js";
export type { LoadFormatterPluginsOptions } from "./plugin-loader.js";
export {
  ClaudeSdkTsRenderer,
  LangGraphTsRenderer,
  VanillaTsRenderer,
  claudeSdkTsPlugin,
  langGraphTsPlugin,
  vanillaTsPlugin,
};
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
