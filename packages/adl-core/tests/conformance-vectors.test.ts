/**
 * Conformance test for the verify test vector pack.
 *
 * Loads every JSON file under
 *   versions/draft/test-vectors/verify/vectors/
 * and asserts that the TypeScript reference implementation produces the
 * documented expected outcome for each vector.
 *
 * This is the same conformance suite that future Python, Go, and Rust
 * ports will run against — the vectors, not any one library, are the
 * source of truth.
 */

import { describe, test, expect } from "bun:test";
import * as fs from "node:fs";
import * as path from "node:path";
import { stringify as yamlStringify } from "yaml";
import {
  verifyPassport,
  type ADLDocument,
  type VerifyConfig,
} from "../src/index";

const VECTORS_DIR = path.resolve(
  import.meta.dir,
  "../../../versions/draft/test-vectors/verify/vectors",
);

interface ExpectedStepOutcome {
  section: string;
  passed: boolean;
  severity: "block" | "warn";
}

interface TestVector {
  id: string;
  description: string;
  spec_sections: string[];
  input: {
    passport: ADLDocument;
    passport_format?: "json" | "yaml";
    retrieval: {
      channel: "discovery" | "direct_url" | "header" | "local_file";
      authority?: string | null;
      discovery_authority?: string | null;
    };
    requesting_agent?: ADLDocument | null;
    did_resolution_responses?: Record<
      string,
      { status: number; body: unknown }
    >;
  };
  config: VerifyConfig;
  expected: {
    verified: boolean;
    public_key_source: "inline_only" | "did_resolved" | "cross_checked" | "none";
    blocked_at_section: string | null;
    step_outcomes: ExpectedStepOutcome[];
  };
}

function loadVectors(): TestVector[] {
  if (!fs.existsSync(VECTORS_DIR)) {
    throw new Error(
      `Vector directory not found: ${VECTORS_DIR}. ` +
        `Run: bun run packages/adl-core/scripts/generate-test-vectors.ts`,
    );
  }
  return fs
    .readdirSync(VECTORS_DIR)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .map((f) => {
      const raw = fs.readFileSync(path.join(VECTORS_DIR, f), "utf-8");
      return JSON.parse(raw) as TestVector;
    });
}

/**
 * Build a fetch implementation that answers from the vector's pre-canned
 * responses. URLs not in the table return a 404 to simulate "no such
 * resource on the network" — vectors that exercise DID resolution must
 * include every URL the resolver might fetch.
 */
function makeVectorFetch(
  responses: Record<string, { status: number; body: unknown }>,
): typeof fetch {
  return (async (input: RequestInfo | URL) => {
    const url = typeof input === "string" ? input : input.toString();
    const r = responses[url];
    if (!r) {
      return new Response(JSON.stringify({ error: "vector_not_mapped", url }), {
        status: 404,
      });
    }
    return new Response(JSON.stringify(r.body), { status: r.status });
  }) as typeof fetch;
}

describe("verify test vector pack conformance", () => {
  const vectors = loadVectors();

  if (vectors.length === 0) {
    test("vectors directory contains files", () => {
      throw new Error(`No vectors found in ${VECTORS_DIR}`);
    });
    return;
  }

  for (const v of vectors) {
    test(`${v.id}: ${v.description}`, async () => {
      // Compute passport bytes per the declared format
      const passportBytes =
        v.input.passport_format === "yaml"
          ? new TextEncoder().encode(yamlStringify(v.input.passport))
          : new TextEncoder().encode(
              JSON.stringify(v.input.passport),
            );

      // Install vector-scoped fetch shim for did:web resolution.
      const originalFetch = globalThis.fetch;
      globalThis.fetch = makeVectorFetch(
        v.input.did_resolution_responses ?? {},
      );

      try {
        const outcome = await verifyPassport(
          {
            passportBytes,
            retrievalChannel: v.input.retrieval.channel,
            retrievalAuthority: v.input.retrieval.authority ?? undefined,
            discoveryAuthority: v.input.retrieval.discovery_authority ?? undefined,
            requestingAgent: v.input.requesting_agent ?? undefined,
          },
          v.config,
        );

        // Top-level result
        expect(outcome.verified).toBe(v.expected.verified);
        expect(outcome.publicKeySource).toBe(v.expected.public_key_source);

        // Blocked-at-section, when applicable
        if (!v.expected.verified) {
          const blocking = outcome.steps.find(
            (s) => !s.passed && s.severity === "block",
          );
          expect(blocking).toBeDefined();
          expect(blocking?.section).toBe(v.expected.blocked_at_section);
        }

        // Per-step expected outcomes
        for (const exp of v.expected.step_outcomes) {
          const matching = outcome.steps.find((s) => s.section === exp.section);
          if (!matching) {
            throw new Error(
              `Vector expects a §${exp.section} step but the implementation did not emit one. ` +
                `Outcome steps: ${outcome.steps.map((s) => s.section).join(", ")}`,
            );
          }
          expect({
            section: matching.section,
            passed: matching.passed,
            severity: matching.severity,
          }).toEqual(exp);
        }
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  }
});
