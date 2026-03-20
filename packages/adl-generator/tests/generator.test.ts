/**
 * End-to-end tests for the generation pipeline.
 */

import { describe, expect, it } from "bun:test";
import { loadADLSync } from "@adl-spec/core";
import { generateAgent, listTargets } from "../src/index.js";
import * as path from "node:path";

const FIXTURES = path.resolve(
  import.meta.dir,
  "../../adl-core/tests/fixtures/valid",
);

function loadFixture(name: string) {
  const result = loadADLSync(path.join(FIXTURES, name));
  if (!result.document) throw new Error(`Failed to load fixture ${name}`);
  return result.document;
}

describe("generateAgent", () => {
  it("lists built-in targets", () => {
    const targets = listTargets();
    expect(targets.length).toBeGreaterThanOrEqual(2);

    const ids = targets.map((t) => t.id);
    expect(ids).toContain("claude-sdk-ts");
    expect(ids).toContain("vanilla-ts");
  });

  it("generates claude-sdk-ts output from production fixture", () => {
    const doc = loadFixture("production.json");
    const result = generateAgent(doc, { target: "claude-sdk-ts" });

    expect(result.target).toBe("claude-sdk-ts");
    expect(result.files.length).toBeGreaterThan(0);

    const filePaths = result.files.map((f) => f.path);
    expect(filePaths).toContain("agent.ts");
    expect(filePaths).toContain("tools.ts");
    expect(filePaths).toContain("types.ts");
  });

  it("generates vanilla-ts output from production fixture", () => {
    const doc = loadFixture("production.json");
    const result = generateAgent(doc, { target: "vanilla-ts" });

    expect(result.target).toBe("vanilla-ts");
    expect(result.files.length).toBeGreaterThan(0);

    const filePaths = result.files.map((f) => f.path);
    expect(filePaths).toContain("agent.ts");
    expect(filePaths).toContain("types.ts");
  });

  it("generates output from minimal fixture", () => {
    const doc = loadFixture("minimal.json");

    const claudeResult = generateAgent(doc, { target: "claude-sdk-ts" });
    expect(claudeResult.files.length).toBeGreaterThan(0);

    const vanillaResult = generateAgent(doc, { target: "vanilla-ts" });
    expect(vanillaResult.files.length).toBeGreaterThan(0);
  });

  it("generates output from with-tools fixture", () => {
    const doc = loadFixture("with-tools.json");

    const claudeResult = generateAgent(doc, { target: "claude-sdk-ts" });
    expect(claudeResult.files.length).toBeGreaterThan(0);

    // Verify tool content appears in generated files
    const agentFile = claudeResult.files.find((f) => f.path === "agent.ts")!;
    expect(agentFile.content).toContain("add");
    expect(agentFile.content).toContain("multiply");
  });

  it("throws for unknown target", () => {
    const doc = loadFixture("minimal.json");
    expect(() => generateAgent(doc, { target: "unknown-target" })).toThrow(
      /Unknown target/,
    );
  });

  it("all generated files have non-empty content", () => {
    const doc = loadFixture("production.json");

    for (const targetId of ["claude-sdk-ts", "vanilla-ts"]) {
      const result = generateAgent(doc, { target: targetId });
      for (const file of result.files) {
        expect(file.content.length).toBeGreaterThan(0);
        expect(file.path.length).toBeGreaterThan(0);
      }
    }
  });
});
