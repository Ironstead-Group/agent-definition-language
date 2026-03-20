/**
 * Vanilla (framework-agnostic) TypeScript target renderer.
 */

import type { AgentIR } from "../../ir/types.js";
import type { GeneratedFile, TargetRenderer } from "../../renderer.js";
import { renderAgent, renderPackageJson, renderTypes } from "./templates.js";

export class VanillaTsRenderer implements TargetRenderer {
  readonly id = "vanilla-ts";
  readonly label = "Vanilla TypeScript (no framework)";
  readonly outputLanguage = "typescript";

  render(ir: AgentIR): GeneratedFile[] {
    const files: GeneratedFile[] = [];

    files.push({ path: "types.ts", content: renderTypes(ir) });
    files.push({ path: "agent.ts", content: renderAgent(ir) });
    files.push({ path: "package.json", content: renderPackageJson(ir) });

    return files;
  }
}
