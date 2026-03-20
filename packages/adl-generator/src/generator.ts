/**
 * Code-generation pipeline: ADL Document -> IR -> target renderer -> output files.
 */

import type { ADLDocument } from "@adl-spec/core";
import { transformToIR } from "./ir/transform.js";
import type { GeneratedFile } from "./renderer.js";
import { getTarget, listTargets as listRegisteredTargets } from "./renderer.js";

export interface GenerateResult {
  target: string;
  files: GeneratedFile[];
}

/**
 * Run the generation pipeline for a given ADL document and target.
 *
 * @throws {Error} if the target is not registered
 */
export function generate(
  doc: ADLDocument,
  targetId: string,
): GenerateResult {
  const renderer = getTarget(targetId);
  if (!renderer) {
    const known = listRegisteredTargets();
    throw new Error(
      `Unknown target "${targetId}". Available targets: ${known.map((t) => t.id).join(", ") || "(none)"}`,
    );
  }

  const ir = transformToIR(doc);
  const files = renderer.render(ir);

  return { target: targetId, files };
}
