/**
 * Tests for the vanilla TypeScript target renderer.
 */

import { describe, expect, it } from "bun:test";
import { loadADLSync } from "@adl-spec/core";
import { transformToIR } from "../../src/ir/transform.js";
import { VanillaTsRenderer } from "../../src/targets/vanilla-ts/index.js";
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

describe("VanillaTsRenderer", () => {
  const renderer = new VanillaTsRenderer();

  it("has correct metadata", () => {
    expect(renderer.id).toBe("vanilla-ts");
    expect(renderer.outputLanguage).toBe("typescript");
  });

  describe("production fixture", () => {
    it("generates 3 files", () => {
      const doc = loadFixture("production.json");
      const ir = transformToIR(doc);
      const files = renderer.render(ir);

      expect(files).toHaveLength(3);
      const paths = files.map((f) => f.path);
      expect(paths).toContain("types.ts");
      expect(paths).toContain("agent.ts");
      expect(paths).toContain("package.json");
    });

    it("generates an Agent class with tool methods", () => {
      const doc = loadFixture("production.json");
      const ir = transformToIR(doc);
      const files = renderer.render(ir);
      const agentFile = files.find((f) => f.path === "agent.ts")!;

      expect(agentFile.content).toContain("class ResearchAssistantAgent");
      expect(agentFile.content).toContain("async searchPapers");
      expect(agentFile.content).toContain("async getPaper");
      expect(agentFile.content).toContain("async saveNote");
      expect(agentFile.content).toContain("listTools()");
    });

    it("includes permission documentation", () => {
      const doc = loadFixture("production.json");
      const ir = transformToIR(doc);
      const files = renderer.render(ir);
      const agentFile = files.find((f) => f.path === "agent.ts")!;

      expect(agentFile.content).toContain("Permission constraints");
      expect(agentFile.content).toContain("api.semanticscholar.org");
    });

    it("generates types matching the tools", () => {
      const doc = loadFixture("production.json");
      const ir = transformToIR(doc);
      const files = renderer.render(ir);
      const typesFile = files.find((f) => f.path === "types.ts")!;

      expect(typesFile.content).toContain("SearchPapersParams");
      expect(typesFile.content).toContain("query: string");
    });

    it("generates package.json without SDK dependencies", () => {
      const doc = loadFixture("production.json");
      const ir = transformToIR(doc);
      const files = renderer.render(ir);
      const pkgFile = files.find((f) => f.path === "package.json")!;
      const pkg = JSON.parse(pkgFile.content);

      expect(pkg.dependencies).toBeUndefined();
      expect(pkg.type).toBe("module");
    });
  });

  describe("minimal fixture", () => {
    it("generates agent with no tool methods", () => {
      const doc = loadFixture("minimal.json");
      const ir = transformToIR(doc);
      const files = renderer.render(ir);

      const agentFile = files.find((f) => f.path === "agent.ts")!;
      expect(agentFile.content).toContain("class HelloAgentAgent");
      expect(agentFile.content).toContain("listTools()");
    });
  });

  describe("with-tools fixture", () => {
    it("generates typed tool methods", () => {
      const doc = loadFixture("with-tools.json");
      const ir = transformToIR(doc);
      const files = renderer.render(ir);

      const agentFile = files.find((f) => f.path === "agent.ts")!;
      expect(agentFile.content).toContain("async add(params: AddParams)");
      expect(agentFile.content).toContain(
        "async multiply(params: MultiplyParams)",
      );

      const typesFile = files.find((f) => f.path === "types.ts")!;
      expect(typesFile.content).toContain("a: number");
      expect(typesFile.content).toContain("b: number");
    });

    it("annotates tool methods with JSDoc flags", () => {
      const doc = loadFixture("with-tools.json");
      const ir = transformToIR(doc);
      const files = renderer.render(ir);

      const agentFile = files.find((f) => f.path === "agent.ts")!;
      expect(agentFile.content).toContain("@readonly");
      expect(agentFile.content).toContain("@idempotent");
    });
  });
});
