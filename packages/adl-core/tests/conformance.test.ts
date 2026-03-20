/**
 * Spec Conformance Tests
 *
 * These tests read the specification artifacts as the source of truth and
 * verify the implementation stays aligned. When a new spec version is
 * released or error codes are added, these tests will fail until the
 * implementation catches up.
 *
 * Source of truth:
 *   versions/manifest.yaml   — latest released version
 *   versions/{id}/schema.json — JSON Schema for each version
 *   versions/{id}/spec.md    — error code table
 *   versions/{id}/examples/  — canonical example documents
 */

import { describe, test, expect } from "bun:test";
import * as fs from "node:fs";
import * as path from "node:path";
import { parse as parseYaml } from "yaml";
import { SUPPORTED_VERSIONS, getSchema } from "../src/schemas/registry";
import { ADL_ERRORS } from "../src/types/errors";
import { validateDocument } from "../src/validate/validator";
import { loadADLSync } from "../src/parse/loader";

const REPO_ROOT = path.resolve(import.meta.dir, "../../..");
const VERSIONS_DIR = path.join(REPO_ROOT, "versions");
const MANIFEST_PATH = path.join(VERSIONS_DIR, "manifest.yaml");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface VersionEntry {
  id: string;
  status: string;
  label: string;
}

interface Manifest {
  latest: string;
  next: string;
  versions: VersionEntry[];
}

function loadManifest(): Manifest {
  const content = fs.readFileSync(MANIFEST_PATH, "utf-8");
  return parseYaml(content) as Manifest;
}

function extractErrorCodesFromSpec(specPath: string): string[] {
  const content = fs.readFileSync(specPath, "utf-8");
  // Match error codes in the spec table: | ADL-XXXX |
  const matches = content.matchAll(/\bADL-(\d{4})\s*\|/g);
  const codes = new Set<string>();
  for (const m of matches) {
    codes.add(`ADL-${m[1]}`);
  }
  return [...codes].sort();
}

function listExampleFiles(versionDir: string): string[] {
  const examplesDir = path.join(versionDir, "examples");
  if (!fs.existsSync(examplesDir)) return [];
  return fs
    .readdirSync(examplesDir)
    .filter((f) => f.endsWith(".yaml") || f.endsWith(".json"))
    .map((f) => path.join(examplesDir, f));
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

const manifest = loadManifest();
const latestVersion = manifest.latest;
const releasedVersions = manifest.versions
  .filter((v) => v.status === "released")
  .map((v) => v.id);

describe("spec conformance", () => {
  // -----------------------------------------------------------------------
  // 1. Schema registry includes every released version
  // -----------------------------------------------------------------------
  describe("schema registry covers all released versions", () => {
    for (const version of releasedVersions) {
      test(`version ${version} is in SUPPORTED_VERSIONS`, () => {
        expect(SUPPORTED_VERSIONS).toContain(version);
      });

      test(`getSchema("${version}") returns the schema`, () => {
        const schema = getSchema(version);
        expect(schema).toBeDefined();
        expect(schema).not.toBeNull();
      });
    }

    test(`latest version (${latestVersion}) is supported`, () => {
      expect(SUPPORTED_VERSIONS).toContain(latestVersion);
    });
  });

  // -----------------------------------------------------------------------
  // 2. Bundled schemas match the canonical versions/ schemas byte-for-byte
  // -----------------------------------------------------------------------
  describe("bundled schemas match canonical sources", () => {
    for (const version of releasedVersions) {
      test(`schema for ${version} matches versions/${version}/schema.json`, () => {
        const canonicalPath = path.join(
          VERSIONS_DIR,
          version,
          "schema.json",
        );
        const canonical = JSON.parse(
          fs.readFileSync(canonicalPath, "utf-8"),
        );
        const bundled = getSchema(version);
        expect(bundled).toEqual(canonical);
      });
    }
  });

  // -----------------------------------------------------------------------
  // 3. Every error code from the spec is in the error catalog
  // -----------------------------------------------------------------------
  describe("error catalog covers all spec error codes", () => {
    const specPath = path.join(VERSIONS_DIR, latestVersion, "spec.md");
    const specCodes = extractErrorCodesFromSpec(specPath);

    test("spec has error codes defined", () => {
      expect(specCodes.length).toBeGreaterThan(0);
    });

    for (const code of specCodes) {
      test(`${code} is defined in ADL_ERRORS`, () => {
        expect(ADL_ERRORS[code]).toBeDefined();
        expect(ADL_ERRORS[code].category).toBeTruthy();
        expect(ADL_ERRORS[code].description).toBeTruthy();
      });
    }

    test("no extra error codes in catalog that are not in the spec", () => {
      const catalogCodes = Object.keys(ADL_ERRORS).sort();
      for (const code of catalogCodes) {
        expect(specCodes).toContain(code);
      }
    });
  });

  // -----------------------------------------------------------------------
  // 4. All canonical examples from every released version validate cleanly
  // -----------------------------------------------------------------------
  describe("canonical examples validate without errors", () => {
    for (const version of releasedVersions) {
      const versionDir = path.join(VERSIONS_DIR, version);
      const examples = listExampleFiles(versionDir);

      for (const examplePath of examples) {
        const basename = path.basename(examplePath);
        test(`${version}/examples/${basename} validates`, () => {
          const { document, errors: loadErrors } = loadADLSync(examplePath);
          expect(loadErrors).toHaveLength(0);
          expect(document).not.toBeNull();

          const { valid, errors } = validateDocument(document!);
          if (!valid) {
            // Show which errors occurred for debugging
            const details = errors
              .map((e) => `${e.code}: ${e.detail}`)
              .join("\n");
            expect(valid).toBe(
              true,
              // @ts-ignore bun:test supports message argument
            );
          }
          expect(errors).toHaveLength(0);
        });
      }
    }
  });

  // -----------------------------------------------------------------------
  // 5. CLI init templates reference the latest spec version
  // -----------------------------------------------------------------------
  describe("CLI init templates reference latest version", () => {
    const initPath = path.join(
      REPO_ROOT,
      "packages/adl-cli/src/commands/init.ts",
    );

    test("init.ts exists", () => {
      expect(fs.existsSync(initPath)).toBe(true);
    });

    test(`init templates use adl_spec "${latestVersion}"`, () => {
      const content = fs.readFileSync(initPath, "utf-8");
      // Should reference the latest version
      expect(content).toContain(`adl_spec: "${latestVersion}"`);
      // Should NOT reference older versions
      for (const version of releasedVersions) {
        if (version !== latestVersion) {
          expect(content).not.toContain(`adl_spec: "${version}"`);
        }
      }
    });

    test(`init templates use $schema URL for ${latestVersion}`, () => {
      const content = fs.readFileSync(initPath, "utf-8");
      const major = latestVersion.split(".").slice(0, 2).join(".");
      expect(content).toContain(
        `https://adl-spec.org/${major}/schema.json`,
      );
    });
  });

  // -----------------------------------------------------------------------
  // 6. Agent passport references the latest spec version
  // -----------------------------------------------------------------------
  describe("agent passport references latest version", () => {
    const passportPath = path.join(
      REPO_ROOT,
      "packages/adl-agent/agent.adl.yaml",
    );

    test("agent passport exists", () => {
      expect(fs.existsSync(passportPath)).toBe(true);
    });

    test(`agent passport uses adl_spec "${latestVersion}"`, () => {
      const { document, errors } = loadADLSync(passportPath);
      expect(errors).toHaveLength(0);
      expect(document!.adl_spec).toBe(latestVersion);
    });

    test("agent passport validates cleanly", () => {
      const { document, errors: loadErrors } = loadADLSync(passportPath);
      expect(loadErrors).toHaveLength(0);
      const { valid, errors } = validateDocument(document!);
      expect(errors).toHaveLength(0);
      expect(valid).toBe(true);
    });
  });
});
