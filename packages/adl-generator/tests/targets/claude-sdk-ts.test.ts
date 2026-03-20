/**
 * Tests for the Claude Agent SDK TypeScript target renderer.
 */

import { describe, expect, it } from "bun:test";
import { loadADLSync } from "@adl-spec/core";
import { transformToIR } from "../../src/ir/transform.js";
import { ClaudeSdkTsRenderer } from "../../src/targets/claude-sdk-ts/index.js";
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

describe("ClaudeSdkTsRenderer", () => {
  const renderer = new ClaudeSdkTsRenderer();

  it("has correct metadata", () => {
    expect(renderer.id).toBe("claude-sdk-ts");
    expect(renderer.outputLanguage).toBe("typescript");
  });

  describe("production fixture", () => {
    it("generates 5 files", () => {
      const doc = loadFixture("production.json");
      const ir = transformToIR(doc);
      const files = renderer.render(ir);

      expect(files).toHaveLength(5);
      const paths = files.map((f) => f.path);
      expect(paths).toContain("types.ts");
      expect(paths).toContain("tools.ts");
      expect(paths).toContain("agent.ts");
      expect(paths).toContain("package.json");
      expect(paths).toContain("tsconfig.json");
    });

    it("generates types with correct interfaces", () => {
      const doc = loadFixture("production.json");
      const ir = transformToIR(doc);
      const files = renderer.render(ir);
      const typesFile = files.find((f) => f.path === "types.ts")!;

      expect(typesFile.content).toContain("SearchPapersParams");
      expect(typesFile.content).toContain("GetPaperParams");
      expect(typesFile.content).toContain("SaveNoteParams");
      expect(typesFile.content).toContain("query: string");
    });

    it("generates tools with proper function signatures", () => {
      const doc = loadFixture("production.json");
      const ir = transformToIR(doc);
      const files = renderer.render(ir);
      const toolsFile = files.find((f) => f.path === "tools.ts")!;

      expect(toolsFile.content).toContain("export async function searchPapers");
      expect(toolsFile.content).toContain("SearchPapersParams");
      expect(toolsFile.content).toContain("export async function getPaper");
      expect(toolsFile.content).toContain("export async function saveNote");
      expect(toolsFile.content).toContain("@readonly");
    });

    it("generates agent with Anthropic SDK imports", () => {
      const doc = loadFixture("production.json");
      const ir = transformToIR(doc);
      const files = renderer.render(ir);
      const agentFile = files.find((f) => f.path === "agent.ts")!;

      expect(agentFile.content).toContain('import Anthropic from "@anthropic-ai/sdk"');
      expect(agentFile.content).toContain("const MODEL =");
      expect(agentFile.content).toContain("claude-sonnet-4-20250514");
      expect(agentFile.content).toContain("TOOLS: Anthropic.Tool[]");
      expect(agentFile.content).toContain("runAgent");
      expect(agentFile.content).toContain("search_papers");
    });

    it("includes permission guard comments", () => {
      const doc = loadFixture("production.json");
      const ir = transformToIR(doc);
      const files = renderer.render(ir);
      const agentFile = files.find((f) => f.path === "agent.ts")!;

      expect(agentFile.content).toContain("Permission Guards");
      expect(agentFile.content).toContain("api.semanticscholar.org");
      expect(agentFile.content).toContain("Filesystem");
    });

    it("generates package.json with @anthropic-ai/sdk dependency", () => {
      const doc = loadFixture("production.json");
      const ir = transformToIR(doc);
      const files = renderer.render(ir);
      const pkgFile = files.find((f) => f.path === "package.json")!;
      const pkg = JSON.parse(pkgFile.content);

      expect(pkg.dependencies["@anthropic-ai/sdk"]).toBeDefined();
      expect(pkg.type).toBe("module");
    });

    it("generates a valid tsconfig.json", () => {
      const doc = loadFixture("production.json");
      const ir = transformToIR(doc);
      const files = renderer.render(ir);
      const tsconfigFile = files.find((f) => f.path === "tsconfig.json")!;
      const tsconfig = JSON.parse(tsconfigFile.content);

      expect(tsconfig.compilerOptions.strict).toBe(true);
      expect(tsconfig.compilerOptions.target).toBe("ESNext");
    });

    it("includes tool-use loop with error handling", () => {
      const doc = loadFixture("production.json");
      const ir = transformToIR(doc);
      const files = renderer.render(ir);
      const agentFile = files.find((f) => f.path === "agent.ts")!;

      // Should have the tool-use loop
      expect(agentFile.content).toContain("tool_use");
      expect(agentFile.content).toContain("TOOL_HANDLERS");
      // Error policy from the production fixture is "retry"
      expect(agentFile.content).toContain("Error policy: retry");
    });
  });

  describe("minimal fixture", () => {
    it("generates files even with no tools", () => {
      const doc = loadFixture("minimal.json");
      const ir = transformToIR(doc);
      const files = renderer.render(ir);

      expect(files.length).toBeGreaterThanOrEqual(3);

      const agentFile = files.find((f) => f.path === "agent.ts")!;
      expect(agentFile.content).toContain("runAgent");
    });
  });

  describe("with-tools fixture", () => {
    it("generates typed parameters from JSON Schema", () => {
      const doc = loadFixture("with-tools.json");
      const ir = transformToIR(doc);
      const files = renderer.render(ir);
      const typesFile = files.find((f) => f.path === "types.ts")!;

      expect(typesFile.content).toContain("AddParams");
      expect(typesFile.content).toContain("MultiplyParams");
      expect(typesFile.content).toContain("a: number");
      expect(typesFile.content).toContain("b: number");
      // return types
      expect(typesFile.content).toContain("AddResult");
      expect(typesFile.content).toContain("MultiplyResult");
    });
  });
});
