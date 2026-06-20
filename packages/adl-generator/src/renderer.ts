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

/**
 * Role of a generated file in the spec-first lifecycle:
 * - "managed": spec-derived, non-business-logic (models, interfaces, tool
 *   schemas). Safe to regenerate on every build; should not be hand-edited.
 * - "scaffold": business logic and project setup (agent implementation,
 *   package manifests). Written once, then owned and edited by the user.
 * Defaults to "scaffold" when unset, so unknown files are never clobbered.
 */
export type GeneratedFileRole = "managed" | "scaffold";

/** A single generated output file. */
export interface GeneratedFile {
  path: string;
  content: string;
  role?: GeneratedFileRole;
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
