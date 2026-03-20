import { describe, test, expect } from "bun:test";
import * as path from "node:path";
import { loadADLSync, validateDocument } from "@adl-spec/core";
import { TOOL_DEFINITIONS, executeTool } from "../src/agent";

const PASSPORT_PATH = path.resolve(import.meta.dir, "..", "agent.adl.yaml");

describe("agent passport", () => {
  test("loads the agent passport without parse errors", () => {
    const { document, errors } = loadADLSync(PASSPORT_PATH);
    expect(errors).toHaveLength(0);
    expect(document).not.toBeNull();
  });

  test("validates the agent passport without errors", () => {
    const { document } = loadADLSync(PASSPORT_PATH);
    const { valid, errors } = validateDocument(document!);
    expect(errors).toHaveLength(0);
    expect(valid).toBe(true);
  });

  test("passport has correct metadata", () => {
    const { document } = loadADLSync(PASSPORT_PATH);
    expect(document!.name).toBe("ADL Spec Explainer");
    expect(document!.adl_spec).toBe("0.2.0");
    expect(document!.version).toBe("0.1.0");
    expect(document!.data_classification.sensitivity).toBe("public");
  });

  test("passport declares 5 tools", () => {
    const { document } = loadADLSync(PASSPORT_PATH);
    expect(document!.tools).toHaveLength(5);
    const toolNames = document!.tools!.map((t) => t.name);
    expect(toolNames).toContain("explain_concept");
    expect(toolNames).toContain("validate_document");
    expect(toolNames).toContain("show_example");
    expect(toolNames).toContain("get_spec_section");
    expect(toolNames).toContain("compare_formats");
  });

  test("all passport tools are read_only", () => {
    const { document } = loadADLSync(PASSPORT_PATH);
    for (const tool of document!.tools!) {
      expect(tool.read_only).toBe(true);
    }
  });
});

describe("agent tool definitions", () => {
  test("defines 5 tools for the Anthropic API", () => {
    expect(TOOL_DEFINITIONS).toHaveLength(5);
  });

  test("tool definition names match passport tool names", () => {
    const { document } = loadADLSync(PASSPORT_PATH);
    const passportNames = document!.tools!.map((t) => t.name).sort();
    const apiNames = TOOL_DEFINITIONS.map((t) => t.name).sort();
    expect(apiNames).toEqual(passportNames);
  });

  test("executeTool returns error for unknown tool", () => {
    const result = JSON.parse(executeTool("nonexistent", {}));
    expect(result.error).toContain("Unknown tool");
  });
});
