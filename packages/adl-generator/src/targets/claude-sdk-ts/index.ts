/**
 * Claude Agent SDK TypeScript target renderer.
 */

import type { AgentIR } from "../../ir/types.js";
import type { GeneratedFile, TargetRenderer } from "../../renderer.js";
import {
  renderAgent,
  renderPackageJson,
  renderTools,
  renderTsConfig,
  renderTypes,
} from "./templates.js";

export class ClaudeSdkTsRenderer implements TargetRenderer {
  readonly id = "claude-sdk-ts";
  readonly label = "Claude Agent SDK (TypeScript)";
  readonly outputLanguage = "typescript";

  render(ir: AgentIR): GeneratedFile[] {
    const files: GeneratedFile[] = [];

    files.push({ path: "types.ts", content: renderTypes(ir) });
    files.push({ path: "tools.ts", content: renderTools(ir) });
    files.push({ path: "agent.ts", content: renderAgent(ir) });
    files.push({ path: "package.json", content: renderPackageJson(ir) });
    files.push({ path: "tsconfig.json", content: renderTsConfig() });

    return files;
  }
}
