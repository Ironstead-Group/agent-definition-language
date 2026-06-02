/**
 * LangGraph TypeScript target renderer.
 */

import type { AgentIR } from "../../ir/types.js";
import { defineFormatterPlugin } from "../../plugin.js";
import type { GeneratedFile, TargetRenderer } from "../../renderer.js";
import {
  renderAgent,
  renderPackageJson,
  renderReadme,
  renderTools,
  renderTsConfig,
  renderTypes,
} from "./templates.js";

export class LangGraphTsRenderer implements TargetRenderer {
  readonly id = "langgraph-ts";
  readonly label = "LangGraph (TypeScript)";
  readonly outputLanguage = "typescript";

  render(ir: AgentIR): GeneratedFile[] {
    const files: GeneratedFile[] = [];

    files.push({ path: "types.ts", content: renderTypes(ir) });
    files.push({ path: "tools.ts", content: renderTools(ir) });
    files.push({ path: "agent.ts", content: renderAgent(ir) });
    files.push({ path: "package.json", content: renderPackageJson(ir) });
    files.push({ path: "tsconfig.json", content: renderTsConfig() });
    files.push({ path: "README.md", content: renderReadme(ir) });

    return files;
  }
}

export const langGraphTsPlugin = defineFormatterPlugin(new LangGraphTsRenderer());
