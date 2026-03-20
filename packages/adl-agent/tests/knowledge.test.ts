import { describe, test, expect } from "bun:test";
import { concepts } from "../src/knowledge/concepts";
import { comparisons } from "../src/knowledge/comparisons";

describe("concepts knowledge base", () => {
  const expectedConcepts = [
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

  test("all expected concepts are defined", () => {
    for (const key of expectedConcepts) {
      expect(concepts[key]).toBeDefined();
    }
  });

  test("all concepts have non-empty title, summary, and details", () => {
    for (const [key, entry] of Object.entries(concepts)) {
      expect(entry.title.length).toBeGreaterThan(0);
      expect(entry.summary.length).toBeGreaterThan(0);
      expect(entry.details.length).toBeGreaterThan(0);
    }
  });

  test("concept count matches expected", () => {
    expect(Object.keys(concepts).length).toBe(expectedConcepts.length);
  });
});

describe("comparisons knowledge base", () => {
  const expectedFormats = ["a2a", "mcp", "openapi", "agent_protocol"];

  test("all expected formats are defined", () => {
    for (const key of expectedFormats) {
      expect(comparisons[key]).toBeDefined();
    }
  });

  test("all comparisons have non-empty fields", () => {
    for (const [key, entry] of Object.entries(comparisons)) {
      expect(entry.format.length).toBeGreaterThan(0);
      expect(entry.relationship.length).toBeGreaterThan(0);
      expect(entry.strengths.length).toBeGreaterThan(0);
      expect(entry.limitations.length).toBeGreaterThan(0);
    }
  });

  test("comparison count matches expected", () => {
    expect(Object.keys(comparisons).length).toBe(expectedFormats.length);
  });
});
