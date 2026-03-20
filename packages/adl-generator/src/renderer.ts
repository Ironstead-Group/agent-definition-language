/**
 * Target renderer interface and registry.
 */

import type { AgentIR } from "./ir/types.js";

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
  render(ir: AgentIR): GeneratedFile[];
}

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

const targets = new Map<string, TargetRenderer>();

/** Register a target renderer in the global registry. */
export function registerTarget(renderer: TargetRenderer): void {
  targets.set(renderer.id, renderer);
}

/** Look up a target renderer by id. */
export function getTarget(id: string): TargetRenderer | undefined {
  return targets.get(id);
}

/** Return all registered target renderers. */
export function listTargets(): TargetRenderer[] {
  return Array.from(targets.values());
}
