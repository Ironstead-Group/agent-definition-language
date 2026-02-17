import { describe, test, expect } from "bun:test";
import { loadDocument } from "../src/core/loader";
import { validateDocument } from "../src/core/validator";
import * as path from "node:path";

const FIXTURES = path.join(import.meta.dir, "fixtures");

describe("validate", () => {
  describe("valid documents", () => {
    test("minimal JSON document", () => {
      const { data, errors } = loadDocument(
        path.join(FIXTURES, "valid/minimal.json"),
      );
      expect(errors).toHaveLength(0);
      const validationErrors = validateDocument(
        data as Record<string, unknown>,
      );
      expect(validationErrors).toHaveLength(0);
    });

    test("document with tools", () => {
      const { data, errors } = loadDocument(
        path.join(FIXTURES, "valid/with-tools.json"),
      );
      expect(errors).toHaveLength(0);
      const validationErrors = validateDocument(
        data as Record<string, unknown>,
      );
      expect(validationErrors).toHaveLength(0);
    });

    test("production document", () => {
      const { data, errors } = loadDocument(
        path.join(FIXTURES, "valid/production.json"),
      );
      expect(errors).toHaveLength(0);
      const validationErrors = validateDocument(
        data as Record<string, unknown>,
      );
      expect(validationErrors).toHaveLength(0);
    });

    test("YAML document", () => {
      const { data, errors } = loadDocument(
        path.join(FIXTURES, "valid/minimal.yaml"),
      );
      expect(errors).toHaveLength(0);
      const validationErrors = validateDocument(
        data as Record<string, unknown>,
      );
      expect(validationErrors).toHaveLength(0);
    });
  });

  describe("invalid documents", () => {
    test("ADL-1001: invalid JSON syntax", () => {
      const { errors } = loadDocument(
        path.join(FIXTURES, "invalid/bad-json.json"),
      );
      expect(errors).toHaveLength(1);
      expect(errors[0].code).toBe("ADL-1001");
    });

    test("ADL-1003: missing required fields", () => {
      const { data, errors } = loadDocument(
        path.join(FIXTURES, "invalid/missing-required.json"),
      );
      expect(errors).toHaveLength(0);
      const validationErrors = validateDocument(
        data as Record<string, unknown>,
      );
      expect(validationErrors.length).toBeGreaterThan(0);
      expect(
        validationErrors.some((e) => e.code === "ADL-1003"),
      ).toBe(true);
    });

    test("ADL-2001: unsupported version", () => {
      const { data, errors } = loadDocument(
        path.join(FIXTURES, "invalid/bad-version.json"),
      );
      expect(errors).toHaveLength(0);
      const validationErrors = validateDocument(
        data as Record<string, unknown>,
      );
      expect(
        validationErrors.some((e) => e.code === "ADL-2001"),
      ).toBe(true);
    });

    test("ADL-2002: duplicate tool names", () => {
      const { data, errors } = loadDocument(
        path.join(FIXTURES, "invalid/duplicate-tools.json"),
      );
      expect(errors).toHaveLength(0);
      const validationErrors = validateDocument(
        data as Record<string, unknown>,
      );
      expect(
        validationErrors.some((e) => e.code === "ADL-2002"),
      ).toBe(true);
    });

    test("ADL-5003: sunset_date before effective_date", () => {
      const { data, errors } = loadDocument(
        path.join(FIXTURES, "invalid/bad-lifecycle.json"),
      );
      expect(errors).toHaveLength(0);
      const validationErrors = validateDocument(
        data as Record<string, unknown>,
      );
      expect(
        validationErrors.some((e) => e.code === "ADL-5003"),
      ).toBe(true);
    });

    test("file not found", () => {
      const { errors } = loadDocument("/nonexistent/file.json");
      expect(errors).toHaveLength(1);
      expect(errors[0].code).toBe("ADL-1001");
    });
  });

  describe("real-world examples", () => {
    test("validates repo examples/production-0.1.0.json", () => {
      const examplePath = path.resolve(
        import.meta.dir,
        "../../../examples/production-0.1.0.json",
      );
      const { data, errors } = loadDocument(examplePath);
      expect(errors).toHaveLength(0);
      const validationErrors = validateDocument(
        data as Record<string, unknown>,
      );
      expect(validationErrors).toHaveLength(0);
    });

    test("validates repo examples/minimal-0.1.0.json", () => {
      const examplePath = path.resolve(
        import.meta.dir,
        "../../../examples/minimal-0.1.0.json",
      );
      const { data, errors } = loadDocument(examplePath);
      expect(errors).toHaveLength(0);
      const validationErrors = validateDocument(
        data as Record<string, unknown>,
      );
      expect(validationErrors).toHaveLength(0);
    });
  });
});
