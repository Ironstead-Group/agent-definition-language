import { describe, test, expect } from "bun:test";
import { loadADLSync } from "../src/parse/loader";
import { parseADL } from "../src/parse/parser";
import { validateDocument } from "../src/validate/validator";
import type { ADLDocument } from "../src/types/document";
import * as path from "node:path";

const FIXTURES = path.join(import.meta.dir, "fixtures");

function loadAndValidate(fixturePath: string) {
  const { document, errors: loadErrors } = loadADLSync(fixturePath);
  if (loadErrors.length > 0) return { loadErrors, validationErrors: [] };
  const { errors: validationErrors } = validateDocument(document!);
  return { loadErrors, validationErrors };
}

function validateInline(doc: Record<string, unknown>) {
  const { document } = parseADL(JSON.stringify(doc));
  return validateDocument(document!);
}

const BASE_DOC = {
  adl_spec: "0.2.0",
  name: "test",
  description: "test",
  version: "1.0.0",
  data_classification: { sensitivity: "public" },
};

describe("validate", () => {
  describe("valid documents", () => {
    test("minimal JSON document", () => {
      const { loadErrors, validationErrors } = loadAndValidate(
        path.join(FIXTURES, "valid/minimal.json"),
      );
      expect(loadErrors).toHaveLength(0);
      expect(validationErrors).toHaveLength(0);
    });

    test("document with tools", () => {
      const { loadErrors, validationErrors } = loadAndValidate(
        path.join(FIXTURES, "valid/with-tools.json"),
      );
      expect(loadErrors).toHaveLength(0);
      expect(validationErrors).toHaveLength(0);
    });

    test("production document", () => {
      const { loadErrors, validationErrors } = loadAndValidate(
        path.join(FIXTURES, "valid/production.json"),
      );
      expect(loadErrors).toHaveLength(0);
      expect(validationErrors).toHaveLength(0);
    });

    test("YAML document", () => {
      const { loadErrors, validationErrors } = loadAndValidate(
        path.join(FIXTURES, "valid/minimal.yaml"),
      );
      expect(loadErrors).toHaveLength(0);
      expect(validationErrors).toHaveLength(0);
    });
  });

  describe("parse errors (ADL-1xxx)", () => {
    test("ADL-1001: invalid JSON syntax", () => {
      const { loadErrors } = loadAndValidate(
        path.join(FIXTURES, "invalid/bad-json.json"),
      );
      expect(loadErrors).toHaveLength(1);
      expect(loadErrors[0].code).toBe("ADL-1001");
    });

    test("ADL-1003: missing required fields", () => {
      const { validationErrors } = loadAndValidate(
        path.join(FIXTURES, "invalid/missing-required.json"),
      );
      expect(validationErrors.length).toBeGreaterThan(0);
      expect(validationErrors.some((e) => e.code === "ADL-1003")).toBe(true);
    });
  });

  describe("semantic: version and duplicates (ADL-200x)", () => {
    test("ADL-2001: unsupported version", () => {
      const { validationErrors } = loadAndValidate(
        path.join(FIXTURES, "invalid/bad-version.json"),
      );
      expect(validationErrors.some((e) => e.code === "ADL-2001")).toBe(true);
    });

    test("ADL-2002: duplicate tool names", () => {
      const { validationErrors } = loadAndValidate(
        path.join(FIXTURES, "invalid/duplicate-tools.json"),
      );
      expect(validationErrors.some((e) => e.code === "ADL-2002")).toBe(true);
    });
  });

  describe("semantic: formats (ADL-2005, ADL-2006, ADL-2007)", () => {
    test("ADL-2005: invalid timestamp format", () => {
      const { errors } = validateInline({
        ...BASE_DOC,
        lifecycle: {
          status: "active",
          effective_date: "not-a-date",
        },
      });
      expect(errors.some((e) => e.code === "ADL-2005")).toBe(true);
    });

    test("ADL-2005: valid timestamps pass", () => {
      const { errors } = validateInline({
        ...BASE_DOC,
        lifecycle: {
          status: "active",
          effective_date: "2026-01-01T00:00:00Z",
        },
      });
      expect(errors.some((e) => e.code === "ADL-2005")).toBe(false);
    });

    test("ADL-2006: invalid URI format", () => {
      const { errors } = validateInline({
        ...BASE_DOC,
        provider: { name: "Test", url: "not-a-uri" },
      });
      expect(errors.some((e) => e.code === "ADL-2006")).toBe(true);
    });

    test("ADL-2006: valid URIs pass", () => {
      const { errors } = validateInline({
        ...BASE_DOC,
        provider: { name: "Test", url: "https://example.com" },
      });
      expect(errors.some((e) => e.code === "ADL-2006")).toBe(false);
    });

    test("ADL-2006: URN identifiers are valid URIs", () => {
      const { errors } = validateInline({
        ...BASE_DOC,
        id: "urn:adl:agent:acme:test:1.0.0",
      });
      expect(errors.some((e) => e.code === "ADL-2006")).toBe(false);
    });

    test("ADL-2007: invalid JSON Schema (non-object parameters)", () => {
      const { errors } = validateInline({
        ...BASE_DOC,
        tools: [
          {
            name: "bad_tool",
            description: "Tool with bad parameters",
            parameters: "not-an-object",
          },
        ],
      });
      expect(errors.some((e) => e.code === "ADL-2007")).toBe(true);
    });
  });

  describe("semantic: model and enums (ADL-2008 through ADL-2015)", () => {
    test("ADL-2008: invalid tool name pattern", () => {
      const { validationErrors } = loadAndValidate(
        path.join(FIXTURES, "invalid/bad-tool-name.json"),
      );
      expect(validationErrors.some((e) => e.code === "ADL-2008")).toBe(true);
    });

    test("ADL-2008: valid tool names pass", () => {
      const { errors } = validateInline({
        ...BASE_DOC,
        tools: [{ name: "valid_tool_123", description: "good" }],
      });
      expect(errors.some((e) => e.code === "ADL-2008")).toBe(false);
    });

    test("ADL-2009: invalid resource type value", () => {
      const { errors } = validateInline({
        ...BASE_DOC,
        resources: [{ name: "res", type: "invalid_type" }],
      });
      expect(errors.some((e) => e.code === "ADL-2009")).toBe(true);
    });

    test("ADL-2010: temperature out of range", () => {
      const { validationErrors } = loadAndValidate(
        path.join(FIXTURES, "invalid/bad-temperature.json"),
      );
      expect(validationErrors.some((e) => e.code === "ADL-2010")).toBe(true);
    });

    test("ADL-2010: valid temperature passes", () => {
      const { errors } = validateInline({
        ...BASE_DOC,
        model: { temperature: 0.7 },
      });
      expect(errors.some((e) => e.code === "ADL-2010")).toBe(false);
    });

    test("ADL-2011: invalid authentication type", () => {
      const { errors } = validateInline({
        ...BASE_DOC,
        security: { authentication: { type: "magic_auth" } },
      });
      expect(errors.some((e) => e.code === "ADL-2011")).toBe(true);
    });

    test("ADL-2012: invalid attestation type", () => {
      const { errors } = validateInline({
        ...BASE_DOC,
        security: { attestation: { type: "unknown_type" } },
      });
      expect(errors.some((e) => e.code === "ADL-2012")).toBe(true);
    });

    test("ADL-2013: invalid error handling action", () => {
      const { errors } = validateInline({
        ...BASE_DOC,
        runtime: { error_handling: { on_tool_error: "panic" } },
      });
      expect(errors.some((e) => e.code === "ADL-2013")).toBe(true);
    });

    test("ADL-2014: invalid output format", () => {
      const { errors } = validateInline({
        ...BASE_DOC,
        runtime: { output_handling: { format: "xml" } },
      });
      expect(errors.some((e) => e.code === "ADL-2014")).toBe(true);
    });

    test("ADL-2015: invalid model capability", () => {
      const { errors } = validateInline({
        ...BASE_DOC,
        model: { capabilities: ["function_calling", "telepathy"] },
      });
      expect(errors.some((e) => e.code === "ADL-2015")).toBe(true);
    });

    test("ADL-2015: valid capabilities pass", () => {
      const { errors } = validateInline({
        ...BASE_DOC,
        model: { capabilities: ["function_calling", "vision"] },
      });
      expect(errors.some((e) => e.code === "ADL-2015")).toBe(false);
    });
  });

  describe("semantic: permissions (ADL-2016, ADL-2017, ADL-2018)", () => {
    test("ADL-2016: ** not allowed in host patterns", () => {
      const { validationErrors } = loadAndValidate(
        path.join(FIXTURES, "invalid/bad-host-pattern.json"),
      );
      expect(validationErrors.some((e) => e.code === "ADL-2016")).toBe(true);
    });

    test("ADL-2016: valid host patterns pass", () => {
      const { errors } = validateInline({
        ...BASE_DOC,
        permissions: {
          network: { allowed_hosts: ["*.example.com", "api.test.org"] },
        },
      });
      expect(errors.some((e) => e.code === "ADL-2016")).toBe(false);
    });

    test("ADL-2017: filesystem paths allow **", () => {
      const { errors } = validateInline({
        ...BASE_DOC,
        permissions: {
          filesystem: {
            allowed_paths: [{ path: "/data/**", access: "read" }],
          },
        },
      });
      expect(errors.some((e) => e.code === "ADL-2017")).toBe(false);
    });

    test("ADL-2018: ** not allowed in env variable patterns", () => {
      const { errors } = validateInline({
        ...BASE_DOC,
        permissions: {
          environment: { allowed_variables: ["APP_**"] },
        },
      });
      expect(errors.some((e) => e.code === "ADL-2018")).toBe(true);
    });

    test("ADL-2018: valid env variable patterns pass", () => {
      const { errors } = validateInline({
        ...BASE_DOC,
        permissions: {
          environment: { allowed_variables: ["APP_*", "DATABASE_URL"] },
        },
      });
      expect(errors.some((e) => e.code === "ADL-2018")).toBe(false);
    });
  });

  describe("semantic: security (ADL-2019, ADL-4001, ADL-4002, ADL-4003)", () => {
    test("ADL-2019: missing digest fields", () => {
      const { validationErrors } = loadAndValidate(
        path.join(FIXTURES, "invalid/bad-digest.json"),
      );
      expect(validationErrors.some((e) => e.code === "ADL-2019")).toBe(true);
    });

    test("ADL-2019: digest with all fields passes", () => {
      const { errors } = validateInline({
        ...BASE_DOC,
        security: {
          attestation: {
            type: "self",
            signature: {
              algorithm: "Ed25519",
              value: "base64sig",
              signed_content: "digest",
              digest_algorithm: "sha-256",
              digest_value: "base64digest",
            },
          },
        },
      });
      expect(errors.some((e) => e.code === "ADL-2019")).toBe(false);
    });

    test("ADL-4001: weak key algorithm", () => {
      const { validationErrors } = loadAndValidate(
        path.join(FIXTURES, "invalid/weak-algorithm.json"),
      );
      expect(validationErrors.some((e) => e.code === "ADL-4001")).toBe(true);
    });

    test("ADL-4001: Ed25519 passes", () => {
      const { errors } = validateInline({
        ...BASE_DOC,
        cryptographic_identity: {
          public_key: { algorithm: "Ed25519", value: "base64key" },
        },
      });
      expect(errors.some((e) => e.code === "ADL-4001")).toBe(false);
    });

    test("ADL-4003: expired attestation", () => {
      const { validationErrors } = loadAndValidate(
        path.join(FIXTURES, "invalid/expired-attestation.json"),
      );
      expect(validationErrors.some((e) => e.code === "ADL-4003")).toBe(true);
    });

    test("ADL-4003: non-expired attestation passes", () => {
      const { errors } = validateInline({
        ...BASE_DOC,
        security: {
          attestation: {
            type: "self",
            expires_at: "2099-01-01T00:00:00Z",
          },
        },
      });
      expect(errors.some((e) => e.code === "ADL-4003")).toBe(false);
    });
  });

  describe("semantic: data classification (ADL-2020 through ADL-2023)", () => {
    test("ADL-2020: invalid data classification sensitivity", () => {
      const { validationErrors } = loadAndValidate(
        path.join(FIXTURES, "invalid/bad-sensitivity.json"),
      );
      expect(validationErrors.some((e) => e.code === "ADL-2020")).toBe(true);
    });

    test("ADL-2021: invalid data classification category", () => {
      const { validationErrors } = loadAndValidate(
        path.join(FIXTURES, "invalid/bad-category.json"),
      );
      expect(validationErrors.some((e) => e.code === "ADL-2021")).toBe(true);
    });

    test("ADL-2022: retention min_days exceeds max_days", () => {
      const { validationErrors } = loadAndValidate(
        path.join(FIXTURES, "invalid/bad-retention.json"),
      );
      expect(validationErrors.some((e) => e.code === "ADL-2022")).toBe(true);
    });

    test("ADL-2023: high-water mark violation", () => {
      const { validationErrors } = loadAndValidate(
        path.join(FIXTURES, "invalid/high-water-mark.json"),
      );
      expect(validationErrors.some((e) => e.code === "ADL-2023")).toBe(true);
    });
  });

  describe("profiles (ADL-3001, ADL-3002)", () => {
    test("ADL-3002: unknown standard profile", () => {
      const { validationErrors } = loadAndValidate(
        path.join(FIXTURES, "invalid/unknown-profile.json"),
      );
      expect(validationErrors.some((e) => e.code === "ADL-3002")).toBe(true);
    });

    test("ADL-3002: known standard profiles pass", () => {
      const { errors } = validateInline({
        ...BASE_DOC,
        profiles: ["urn:adl:profile:governance:1.0"],
        // Will fail ADL-3001 (missing governance fields) but not ADL-3002
      });
      expect(errors.some((e) => e.code === "ADL-3002")).toBe(false);
    });

    test("ADL-3002: vendor profiles (non-urn:adl:profile:) are not flagged", () => {
      const { errors } = validateInline({
        ...BASE_DOC,
        profiles: ["https://acme.com/adl/extensions/v1"],
      });
      expect(errors.some((e) => e.code === "ADL-3002")).toBe(false);
    });

    test("ADL-3001: governance profile missing requirements", () => {
      const { errors } = validateInline({
        ...BASE_DOC,
        profiles: ["urn:adl:profile:governance:1.0"],
      });
      expect(errors.some((e) => e.code === "ADL-3001")).toBe(true);
      expect(
        errors.some(
          (e) =>
            e.code === "ADL-3001" &&
            e.detail.includes("compliance_framework"),
        ),
      ).toBe(true);
      expect(
        errors.some(
          (e) => e.code === "ADL-3001" && e.detail.includes("autonomy"),
        ),
      ).toBe(true);
    });
  });

  describe("lifecycle (ADL-5001, ADL-5002, ADL-5003)", () => {
    test("ADL-5001: invalid lifecycle status value", () => {
      const { errors } = validateInline({
        ...BASE_DOC,
        lifecycle: { status: "invalid_status" },
      });
      expect(errors.some((e) => e.code === "ADL-5001")).toBe(true);
    });

    test("ADL-5001: valid lifecycle status passes", () => {
      const { errors } = validateInline({
        ...BASE_DOC,
        lifecycle: { status: "active" },
      });
      expect(errors.some((e) => e.code === "ADL-5001")).toBe(false);
    });

    test("ADL-5002: successor on active agent", () => {
      const { validationErrors } = loadAndValidate(
        path.join(FIXTURES, "invalid/successor-on-active.json"),
      );
      expect(validationErrors.some((e) => e.code === "ADL-5002")).toBe(true);
    });

    test("ADL-5002: successor on draft agent", () => {
      const { errors } = validateInline({
        ...BASE_DOC,
        lifecycle: {
          status: "draft",
          successor: "urn:adl:agent:acme:new:1.0.0",
        },
      });
      expect(errors.some((e) => e.code === "ADL-5002")).toBe(true);
    });

    test("ADL-5002: successor on deprecated agent passes", () => {
      const { errors } = validateInline({
        ...BASE_DOC,
        lifecycle: {
          status: "deprecated",
          effective_date: "2026-01-01T00:00:00Z",
          successor: "urn:adl:agent:acme:new:1.0.0",
        },
      });
      expect(errors.some((e) => e.code === "ADL-5002")).toBe(false);
    });

    test("ADL-5002: successor on retired agent passes", () => {
      const { errors } = validateInline({
        ...BASE_DOC,
        lifecycle: {
          status: "retired",
          effective_date: "2026-01-01T00:00:00Z",
          sunset_date: "2027-01-01T00:00:00Z",
          successor: "urn:adl:agent:acme:new:1.0.0",
        },
      });
      expect(errors.some((e) => e.code === "ADL-5002")).toBe(false);
    });

    test("ADL-5003: sunset_date before effective_date", () => {
      const { validationErrors } = loadAndValidate(
        path.join(FIXTURES, "invalid/bad-lifecycle.json"),
      );
      expect(validationErrors.some((e) => e.code === "ADL-5003")).toBe(true);
    });
  });

  describe("validate options", () => {
    test("skipSchema: only runs semantic checks", () => {
      const { document } = parseADL(
        JSON.stringify({
          adl_spec: "99.99.99",
          name: "test",
          description: "test",
          version: "1.0.0",
          data_classification: { sensitivity: "public" },
        }),
      );
      const { errors } = validateDocument(document!, { skipSchema: true });
      expect(errors.some((e) => e.code === "ADL-2001")).toBe(true);
      expect(errors.every((e) => !e.code.startsWith("ADL-1"))).toBe(true);
    });

    test("skipSemantic: only runs schema checks", () => {
      const { document } = parseADL(
        JSON.stringify({
          adl_spec: "0.1.0",
          name: "test",
          description: "test",
          version: "1.0.0",
          data_classification: { sensitivity: "public" },
          tools: [
            { name: "dup", description: "first" },
            { name: "dup", description: "second" },
          ],
        }),
      );
      const { errors } = validateDocument(document!, { skipSemantic: true });
      expect(errors.some((e) => e.code === "ADL-2002")).toBe(false);
    });
  });

  describe("real-world examples", () => {
    test("validates versions/0.1.0/examples/production.yaml", () => {
      const examplePath = path.resolve(
        import.meta.dir,
        "../../../versions/0.1.0/examples/production.yaml",
      );
      const { loadErrors, validationErrors } = loadAndValidate(examplePath);
      expect(loadErrors).toHaveLength(0);
      expect(validationErrors).toHaveLength(0);
    });

    test("validates versions/0.1.0/examples/minimal.yaml", () => {
      const examplePath = path.resolve(
        import.meta.dir,
        "../../../versions/0.1.0/examples/minimal.yaml",
      );
      const { loadErrors, validationErrors } = loadAndValidate(examplePath);
      expect(loadErrors).toHaveLength(0);
      expect(validationErrors).toHaveLength(0);
    });

    test("validates versions/0.2.0/examples/production.yaml", () => {
      const examplePath = path.resolve(
        import.meta.dir,
        "../../../versions/0.2.0/examples/production.yaml",
      );
      const { loadErrors, validationErrors } = loadAndValidate(examplePath);
      expect(loadErrors).toHaveLength(0);
      expect(validationErrors).toHaveLength(0);
    });

    test("validates versions/0.2.0/examples/minimal.yaml", () => {
      const examplePath = path.resolve(
        import.meta.dir,
        "../../../versions/0.2.0/examples/minimal.yaml",
      );
      const { loadErrors, validationErrors } = loadAndValidate(examplePath);
      expect(loadErrors).toHaveLength(0);
      expect(validationErrors).toHaveLength(0);
    });
  });
});
