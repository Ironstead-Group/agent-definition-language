/**
 * Tests for the LangGraph TypeScript target renderer.
 */

import { describe, expect, it } from "bun:test";
import { loadADLSync } from "@adl-spec/core";
import { transformToIR } from "../../src/ir/transform.js";
import { LangGraphTsRenderer } from "../../src/targets/langgraph-ts/index.js";
import * as path from "node:path";

const FIXTURES = path.resolve(
  import.meta.dir,
  "../../../adl-core/tests/fixtures/valid",
);

function loadFixture(name: string) {
  const result = loadADLSync(path.join(FIXTURES, name));
  if (!result.document) throw new Error(`Failed to load fixture ${name}`);
  return result.document;
}

describe("LangGraphTsRenderer", () => {
  const renderer = new LangGraphTsRenderer();

  it("has correct metadata", () => {
    expect(renderer.id).toBe("langgraph-ts");
    expect(renderer.outputLanguage).toBe("typescript");
  });

  it("generates LangGraph project files", () => {
    const doc = loadFixture("production.json");
    const ir = transformToIR(doc);
    const files = renderer.render(ir);

    expect(files).toHaveLength(6);
    const paths = files.map((f) => f.path);
    expect(paths).toContain("agent.ts");
    expect(paths).toContain("tools.ts");
    expect(paths).toContain("types.ts");
    expect(paths).toContain("package.json");
    expect(paths).toContain("tsconfig.json");
    expect(paths).toContain("README.md");
  });

  it("generates a StateGraph with ADL runtime policy", () => {
    const doc = loadFixture("production.json");
    const ir = transformToIR(doc);
    const files = renderer.render(ir);
    const agentFile = files.find((f) => f.path === "agent.ts")!;

    expect(agentFile.content).toContain("new StateGraph(MessagesState)");
    expect(agentFile.content).toContain(".addNode(\"llmCall\", llmCall)");
    expect(agentFile.content).toContain(".addNode(\"toolNode\", toolNode)");
    expect(agentFile.content).toContain("TOOL_INVOCATION_PARALLEL = true");
    expect(agentFile.content).toContain("TOOL_ERROR_ACTION = \"retry\"");
    expect(agentFile.content).toContain("anthropic:claude-sonnet-4-20250514");
  });

  it("maps ADL tools to LangChain tools with Zod schemas", () => {
    const doc = loadFixture("with-tools.json");
    const ir = transformToIR(doc);
    const files = renderer.render(ir);
    const toolsFile = files.find((f) => f.path === "tools.ts")!;

    expect(toolsFile.content).toContain('import { tool } from "@langchain/core/tools";');
    expect(toolsFile.content).toContain("export const addTool = tool(addImpl");
    expect(toolsFile.content).toContain("\"a\": z.number()");
    expect(toolsFile.content).toContain("\"b\": z.number()");
    expect(toolsFile.content).toContain("\"add\": addTool");
    expect(toolsFile.content).toContain("requiresConfirmation: false");
  });

  it("includes LangGraph dependencies in package.json", () => {
    const doc = loadFixture("production.json");
    const ir = transformToIR(doc);
    const files = renderer.render(ir);
    const pkgFile = files.find((f) => f.path === "package.json")!;
    const pkg = JSON.parse(pkgFile.content);

    expect(pkg.dependencies["@langchain/langgraph"]).toBeDefined();
    expect(pkg.dependencies["@langchain/core"]).toBeDefined();
    expect(pkg.dependencies.langchain).toBeDefined();
    expect(pkg.dependencies["@langchain/anthropic"]).toBeDefined();
  });
});
