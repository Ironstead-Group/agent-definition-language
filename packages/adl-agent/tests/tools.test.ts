import { describe, test, expect } from "bun:test";
import { explainConcept } from "../src/tools/explain-concept";
import { validateDocumentTool } from "../src/tools/validate-document";
import { showExample } from "../src/tools/show-example";
import { getSpecSection } from "../src/tools/get-spec-section";
import { compareFormats } from "../src/tools/compare-formats";

describe("explain_concept tool", () => {
  test("returns explanation for a known concept by key", () => {
    const result = explainConcept({ concept: "passport_model" });
    expect(result.found).toBe(true);
    expect(result.entry).toBeDefined();
    expect(result.entry!.title).toBe("The Passport Model");
    expect(result.entry!.summary.length).toBeGreaterThan(0);
    expect(result.entry!.details.length).toBeGreaterThan(0);
  });

  test("returns explanation for a concept with spaces", () => {
    const result = explainConcept({ concept: "passport model" });
    expect(result.found).toBe(true);
    expect(result.concept).toBe("passport_model");
  });

  test("returns explanation for a fuzzy match", () => {
    const result = explainConcept({ concept: "permissions" });
    expect(result.found).toBe(true);
    expect(result.concept).toBe("permissions");
  });

  test("returns available concepts for unknown concept", () => {
    const result = explainConcept({ concept: "nonexistent_concept_xyz" });
    expect(result.found).toBe(false);
    expect(result.available_concepts).toBeDefined();
    expect(result.available_concepts!.length).toBeGreaterThan(0);
  });

  test("handles all defined concept keys", () => {
    const keys = [
      "passport_model",
      "tools",
      "permissions",
      "data_classification",
      "profiles",
      "lifecycle",
      "security",
      "extensions",
      "system_prompt",
      "converters",
    ];
    for (const key of keys) {
      const result = explainConcept({ concept: key });
      expect(result.found).toBe(true);
      expect(result.entry).toBeDefined();
    }
  });
});

describe("validate_document tool", () => {
  test("validates a correct minimal YAML document", () => {
    const doc = `
adl_spec: "0.2.0"
name: Test Agent
description: A test agent.
version: "1.0.0"
data_classification:
  sensitivity: public
`;
    const result = validateDocumentTool({ document: doc });
    expect(result.valid).toBe(true);
    expect(result.parse_errors).toHaveLength(0);
    expect(result.validation_errors).toHaveLength(0);
    expect(result.summary).toBe("Document is valid ADL.");
  });

  test("validates a correct minimal JSON document", () => {
    const doc = JSON.stringify({
      adl_spec: "0.2.0",
      name: "Test Agent",
      description: "A test agent.",
      version: "1.0.0",
      data_classification: { sensitivity: "public" },
    });
    const result = validateDocumentTool({ document: doc });
    expect(result.valid).toBe(true);
    expect(result.parse_errors).toHaveLength(0);
    expect(result.validation_errors).toHaveLength(0);
  });

  test("reports parse errors for invalid YAML", () => {
    const result = validateDocumentTool({ document: "{{invalid yaml" });
    expect(result.valid).toBe(false);
    expect(result.parse_errors.length).toBeGreaterThan(0);
    expect(result.parse_errors[0].explanation.length).toBeGreaterThan(0);
  });

  test("reports validation errors for missing required fields", () => {
    const doc = JSON.stringify({ adl_spec: "0.2.0" });
    const result = validateDocumentTool({ document: doc });
    expect(result.valid).toBe(false);
    expect(result.validation_errors.length).toBeGreaterThan(0);
  });

  test("reports validation errors for unsupported version", () => {
    const doc = JSON.stringify({
      adl_spec: "99.0.0",
      name: "Test",
      description: "Test",
      version: "1.0.0",
      data_classification: { sensitivity: "public" },
    });
    const result = validateDocumentTool({ document: doc });
    expect(result.valid).toBe(false);
    const codes = result.validation_errors.map((e) => e.code);
    expect(codes).toContain("ADL-2001");
  });

  test("errors include explanations", () => {
    const doc = JSON.stringify({
      adl_spec: "0.2.0",
      name: "Test",
      description: "Test",
      version: "1.0.0",
      data_classification: { sensitivity: "public" },
      tools: [
        { name: "dup", description: "first" },
        { name: "dup", description: "second" },
      ],
    });
    const result = validateDocumentTool({ document: doc });
    expect(result.valid).toBe(false);
    const dupError = result.validation_errors.find(
      (e) => e.code === "ADL-2002",
    );
    expect(dupError).toBeDefined();
    expect(dupError!.explanation.length).toBeGreaterThan(0);
  });
});

describe("show_example tool", () => {
  test("returns the minimal example", () => {
    const result = showExample({ category: "minimal" });
    expect(result.found).toBe(true);
    expect(result.content).toBeDefined();
    expect(result.content).toContain("adl_spec");
    expect(result.filename).toBe("minimal.yaml");
  });

  test("returns the production example", () => {
    const result = showExample({ category: "production" });
    expect(result.found).toBe(true);
    expect(result.content).toBeDefined();
    expect(result.content).toContain("adl_spec");
  });

  test("returns the with-tools example", () => {
    const result = showExample({ category: "with-tools" });
    expect(result.found).toBe(true);
    expect(result.content).toBeDefined();
    expect(result.content).toContain("tools");
  });

  test("returns not found for unknown category", () => {
    const result = showExample({ category: "nonexistent" });
    expect(result.found).toBe(false);
    expect(result.available_categories).toBeDefined();
    expect(result.available_categories).toContain("minimal");
  });
});

describe("get_spec_section tool", () => {
  test("returns overview section", () => {
    const result = getSpecSection({ section: "overview" });
    expect(result.found).toBe(true);
    expect(result.title).toBeDefined();
    expect(result.content).toBeDefined();
    expect(result.content!.length).toBeGreaterThan(0);
  });

  test("returns tools section", () => {
    const result = getSpecSection({ section: "tools" });
    expect(result.found).toBe(true);
    expect(result.title).toContain("Tools");
  });

  test("returns permissions section", () => {
    const result = getSpecSection({ section: "permissions" });
    expect(result.found).toBe(true);
  });

  test("returns not found for unknown section", () => {
    const result = getSpecSection({ section: "nonexistent_section_xyz" });
    expect(result.found).toBe(false);
  });

  test("fuzzy matches section names", () => {
    const result = getSpecSection({ section: "data classification" });
    expect(result.found).toBe(true);
    expect(result.section).toBe("data_classification");
  });
});

describe("compare_formats tool", () => {
  test("returns A2A comparison", () => {
    const result = compareFormats({ format: "a2a" });
    expect(result.found).toBe(true);
    expect(result.comparison).toBeDefined();
    expect(result.comparison!.format).toContain("A2A");
  });

  test("returns MCP comparison", () => {
    const result = compareFormats({ format: "mcp" });
    expect(result.found).toBe(true);
    expect(result.comparison!.format).toContain("MCP");
  });

  test("returns OpenAPI comparison", () => {
    const result = compareFormats({ format: "openapi" });
    expect(result.found).toBe(true);
    expect(result.comparison!.format).toContain("OpenAPI");
  });

  test("returns Agent Protocol comparison", () => {
    const result = compareFormats({ format: "agent_protocol" });
    expect(result.found).toBe(true);
    expect(result.comparison!.format).toContain("Agent Protocol");
  });

  test("returns not found for unknown format", () => {
    const result = compareFormats({ format: "nonexistent" });
    expect(result.found).toBe(false);
    expect(result.available_formats).toBeDefined();
    expect(result.available_formats!.length).toBeGreaterThan(0);
  });
});
