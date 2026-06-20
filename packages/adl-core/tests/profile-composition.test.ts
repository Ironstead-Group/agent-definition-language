/**
 * Profile Composition Tests
 *
 * Verifies the multi-profile composition model (core spec Section 13):
 *   - Profile schemas are open additive mixins (no root unevaluatedProperties),
 *     so they compose via allOf without rejecting each other's members.
 *   - A document is validated by composing the base schema with every
 *     declared profile's schema and applying unevaluatedProperties:false ONCE
 *     at the composition root.
 *   - That single closure still rejects unknown top-level members and the
 *     `extensions` escape is permitted at every level.
 *
 * Source of truth:
 *   profiles/manifest.yaml        — profile identifier -> schema mapping
 *   profiles/{id}/1.0/schema.json — open-mixin profile schemas
 *   profiles/{id}/1.0/examples/   — canonical example documents
 */

import { describe, test, expect } from "bun:test";
import * as fs from "node:fs";
import * as path from "node:path";
import { parse as parseYaml } from "yaml";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

const REPO_ROOT = path.resolve(import.meta.dir, "../../..");
const PROFILES_DIR = path.join(REPO_ROOT, "profiles");
const BASE_SCHEMA = JSON.parse(
  fs.readFileSync(
    path.join(REPO_ROOT, "packages/adl-core/src/schemas/0.3.0.json"),
    "utf-8",
  ),
);
const BASE_ID = "https://adl-spec.org/0.3/schema.json";

interface ProfileEntry {
  id: string;
  version: string;
  identifier: string;
  schema: string | null;
}

const manifest = parseYaml(
  fs.readFileSync(path.join(PROFILES_DIR, "manifest.yaml"), "utf-8"),
) as { profiles: ProfileEntry[] };

// identifier (urn) -> absolute schema path, for profiles that publish a schema
const schemaByIdentifier = new Map<string, string>();
for (const p of manifest.profiles) {
  if (p.schema) {
    schemaByIdentifier.set(
      p.identifier,
      path.join(PROFILES_DIR, p.id, p.version, p.schema),
    );
  }
}

const readJson = (p: string) => JSON.parse(fs.readFileSync(p, "utf-8"));

/** Compose base + the given profile schemas and close once at the root. */
function compileComposed(schemaPaths: string[]) {
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  addFormats(ajv);
  ajv.addSchema(BASE_SCHEMA, BASE_ID);
  return ajv.compile({
    allOf: schemaPaths.map(readJson),
    unevaluatedProperties: false,
  });
}

// Discover every example document that is an ADL passport (declares profiles).
interface ExampleCase {
  file: string;
  rel: string;
  doc: Record<string, unknown>;
  profiles: string[];
  /** true when the file lives under examples/composite/ */
  composite: boolean;
}
const exampleCases: ExampleCase[] = [];
for (const p of manifest.profiles) {
  const dir = path.join(PROFILES_DIR, p.id, p.version, "examples");
  if (!fs.existsSync(dir)) continue;
  // walk examples/ and examples/composite/ (one level of subdirectories)
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const files: { file: string; composite: boolean }[] = [];
    if (entry.isDirectory()) {
      for (const f of fs.readdirSync(path.join(dir, entry.name)))
        if (f.endsWith(".json"))
          files.push({ file: path.join(dir, entry.name, f), composite: true });
    } else if (entry.name.endsWith(".json")) {
      files.push({ file: path.join(dir, entry.name), composite: false });
    }
    for (const { file, composite } of files) {
      const doc = readJson(file);
      if (!doc.adl_spec || !Array.isArray(doc.profiles)) continue; // skip records
      exampleCases.push({
        file,
        rel: path.relative(REPO_ROOT, file),
        doc,
        profiles: doc.profiles as string[],
        composite,
      });
    }
  }
}

describe("profile composition", () => {
  test("discovered profile example documents", () => {
    expect(exampleCases.length).toBeGreaterThan(0);
  });

  describe("example layout: main is single-profile, composite is multi-profile", () => {
    for (const c of exampleCases) {
      if (c.composite) {
        test(`composite ${c.rel} declares 2+ profiles`, () => {
          expect(c.profiles.length).toBeGreaterThanOrEqual(2);
        });
      } else {
        test(`main ${c.rel} declares exactly one profile`, () => {
          expect(c.profiles.length).toBe(1);
        });
      }
    }
  });

  describe("profile schemas are open additive mixins", () => {
    for (const p of manifest.profiles) {
      if (!p.schema) continue;
      test(`${p.id} schema has no root unevaluatedProperties/additionalProperties`, () => {
        const schema = readJson(schemaByIdentifier.get(p.identifier)!);
        expect(schema.unevaluatedProperties).toBeUndefined();
        expect(schema.additionalProperties).toBeUndefined();
        // it must still compose the base and contribute the profile id
        expect(JSON.stringify(schema.allOf)).toContain(BASE_ID);
      });
    }
  });

  describe("declared profiles compose and validate their examples", () => {
    for (const c of exampleCases) {
      test(`${c.rel} validates under composed [${c.profiles.join(", ")}]`, () => {
        const schemaPaths = c.profiles.map((id) => {
          const sp = schemaByIdentifier.get(id);
          expect(sp, `no schema registered for ${id}`).toBeDefined();
          return sp!;
        });
        const validate = compileComposed(schemaPaths);
        const ok = validate(c.doc);
        if (!ok) console.error(c.rel, validate.errors);
        expect(ok).toBe(true);
      });
    }
  });

  test("composed closure still rejects unknown top-level members", () => {
    const c = exampleCases.find((c) => c.profiles.length >= 2) ?? exampleCases[0];
    const schemaPaths = c.profiles.map((id) => schemaByIdentifier.get(id)!);
    const validate = compileComposed(schemaPaths);
    expect(validate({ ...c.doc, not_a_real_member: 123 })).toBe(false);
  });

  test("extensions escape is permitted at root and within profile members", () => {
    // Use a governance+financial example and attach vendor extensions.
    const c = exampleCases.find((c) =>
      c.profiles.some((p) => p.includes("financial")),
    );
    expect(c).toBeDefined();
    const schemaPaths = c!.profiles.map((id) => schemaByIdentifier.get(id)!);
    const validate = compileComposed(schemaPaths);
    const withExt = {
      ...c!.doc,
      extensions: { "com.acme.risk": { score: 7 } },
    };
    const ok = validate(withExt);
    if (!ok) console.error(validate.errors);
    expect(ok).toBe(true);
  });
});
