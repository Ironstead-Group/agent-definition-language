/**
 * Target renderer interface and registry.
 */

import type { AgentIR } from "./ir/types.js";
import {
  defineFormatterPlugin,
  getPlugin,
  listPlugins,
  registerPlugin,
} from "./plugin.js";
import type { FormatterPlugin, FormatterRenderContext } from "./plugin.js";

/** A single generated output file. */
export interface GeneratedFile {
  path: string;
  content: string;
}

/** Interface that all code-generation targets must implement. */
export interface TargetRenderer {
  readonly id: string;
  readonly label: string;
  readonly outputLanguage: string;
  render(ir: AgentIR, context?: FormatterRenderContext): GeneratedFile[];
}

// ---------------------------------------------------------------------------
// Compatibility registry API
// ---------------------------------------------------------------------------

/** Register a target renderer in the global registry. */
export function registerTarget(renderer: TargetRenderer): void {
  registerPlugin(defineFormatterPlugin(renderer));
}

/** Look up a target renderer by id. */
export function getTarget(id: string): FormatterPlugin | undefined {
  return getPlugin(id);
}

/** Return all registered target renderers. */
export function listTargets(): FormatterPlugin[] {
  return listPlugins();
}
