/**
 * End-to-end CLI tests for the agent-friendly patterns:
 * non-interactive flags, stdin pipelines, --json output, --dry-run,
 * idempotency guard + --force, and --help examples.
 */

import { describe, test, expect } from "bun:test";
import * as path from "node:path";
import * as fs from "node:fs";
import * as os from "node:os";

const ENTRY = path.resolve(import.meta.dir, "../src/index.ts");

const MINIMAL_DOC = JSON.stringify({
  adl_spec: "0.3.0",
  name: "test-agent",
  description: "A document piped through the CLI.",
  version: "0.1.0",
  data_classification: { sensitivity: "internal" },
});

function run(args: string[], stdin?: string) {
  const proc = Bun.spawnSync({
    cmd: ["bun", ENTRY, ...args],
    stdin: stdin !== undefined ? Buffer.from(stdin) : undefined,
    stdout: "pipe",
    stderr: "pipe",
  });
  return {
    code: proc.exitCode,
    stdout: proc.stdout.toString(),
    stderr: proc.stderr.toString(),
  };
}

describe("adl CLI", () => {
  test("no args shows help (non-interactive, discoverable)", () => {
    const r = run([]);
    expect(r.stdout + r.stderr).toContain("Usage: adl");
  });

  test("each command's --help includes Examples", () => {
    for (const cmd of ["validate", "convert", "init", "generate"]) {
      const r = run([cmd, "--help"]);
      expect(r.stdout).toContain("Examples:");
    }
  });

  describe("validate", () => {
    test("reads a document from stdin via '-'", () => {
      const r = run(["validate", "-"], MINIMAL_DOC);
      expect(r.code).toBe(0);
      expect(r.stdout).toContain("is valid");
    });

    test("--json emits a structured result", () => {
      const r = run(["validate", "-", "--json"], MINIMAL_DOC);
      expect(r.code).toBe(0);
      const out = JSON.parse(r.stdout);
      expect(out.valid).toBe(true);
      expect(out.results[0].file).toBe("<stdin>");
    });

    test("exits non-zero on an invalid document", () => {
      const bad = JSON.stringify({ adl_spec: "0.3.0", name: "x" });
      const r = run(["validate", "-", "--json"], bad);
      expect(r.code).not.toBe(0);
      const out = JSON.parse(r.stdout);
      expect(out.valid).toBe(false);
    });
  });

  describe("convert", () => {
    test("converts a stdin document to A2A on stdout", () => {
      const r = run(["convert", "-", "--to", "a2a"], MINIMAL_DOC);
      expect(r.code).toBe(0);
      const card = JSON.parse(r.stdout);
      expect(card.name).toBe("test-agent");
    });

    test("rejects an unknown format with an example invocation", () => {
      const r = run(["convert", "-", "--to", "bogus"], MINIMAL_DOC);
      expect(r.code).not.toBe(0);
      expect(r.stderr).toContain("--to a2a");
    });
  });

  describe("init", () => {
    test("--dry-run prints to stdout and writes no file", () => {
      const r = run(["init", "--dry-run"]);
      expect(r.code).toBe(0);
      expect(r.stdout).toContain('"adl_spec"');
      expect(fs.existsSync(path.resolve(process.cwd(), "agent.adl.json"))).toBe(false);
    });

    test("--dry-run --json reports it did not write", () => {
      const r = run(["init", "--template", "governance", "--dry-run", "--json"]);
      const out = JSON.parse(r.stdout);
      expect(out.wrote).toBe(false);
      expect(out.template).toBe("governance");
    });

    test("writes, guards against overwrite, then --force overwrites (idempotent-safe)", () => {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), "adl-init-"));
      const out = path.join(dir, "a.adl.json");
      try {
        expect(run(["init", "--output", out]).code).toBe(0);
        expect(fs.existsSync(out)).toBe(true);
        // second run without --force must fail rather than clobber
        const guard = run(["init", "--output", out]);
        expect(guard.code).not.toBe(0);
        expect(guard.stderr).toContain("--force");
        // with --force it succeeds
        expect(run(["init", "--output", out, "--force"]).code).toBe(0);
      } finally {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    });

    test("unknown template fails with an example invocation", () => {
      const r = run(["init", "--template", "nope"]);
      expect(r.code).not.toBe(0);
      expect(r.stderr).toContain("adl init --template");
    });
  });

  describe("generate", () => {
    test("--list-targets --json emits structured targets", () => {
      const r = run(["generate", "--list-targets", "--json"]);
      expect(r.code).toBe(0);
      const out = JSON.parse(r.stdout);
      expect(Array.isArray(out.targets)).toBe(true);
    });

    test("--dry-run reports files without writing", () => {
      const r = run(["generate", "-", "--target", "vanilla-ts", "--dry-run", "--json"], MINIMAL_DOC);
      // dry-run should not fail and should not create ./generated
      expect(r.code).toBe(0);
      const out = JSON.parse(r.stdout);
      expect(out.dryRun).toBe(true);
      expect(out.generated[0].files.length).toBeGreaterThan(0);
    });
  });
});
