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

function run(args: string[], stdin?: string, cwd?: string) {
  const proc = Bun.spawnSync({
    cmd: ["bun", ENTRY, ...args],
    stdin: stdin !== undefined ? Buffer.from(stdin) : undefined,
    stdout: "pipe",
    stderr: "pipe",
    cwd,
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

  describe("generate from adl.config.json (multi-source)", () => {
    function makeProject(): string {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), "adl-cfg-"));
      fs.mkdirSync(path.join(dir, "agents"));
      const billing = JSON.parse(MINIMAL_DOC);
      billing.name = "billing-agent";
      const support = JSON.parse(MINIMAL_DOC);
      support.name = "support-agent";
      fs.writeFileSync(path.join(dir, "agents/billing.adl.json"), JSON.stringify(billing));
      fs.writeFileSync(path.join(dir, "agents/support.adl.json"), JSON.stringify(support));
      fs.writeFileSync(
        path.join(dir, "adl.config.json"),
        JSON.stringify({
          generate: [
            { source: "agents/billing.adl.json", target: "vanilla-ts", output: "gen/billing", clean: true },
            { source: "agents/support.adl.json", target: "vanilla-ts", output: "gen/support" },
          ],
        }),
      );
      return dir;
    }

    test("generates every entry from all sources, overwriting", () => {
      const dir = makeProject();
      try {
        const r = run(["generate", "--json"], undefined, dir);
        expect(r.code).toBe(0);
        const out = JSON.parse(r.stdout);
        expect(out.generated.map((g: { source: string }) => g.source).sort()).toEqual([
          "agents/billing.adl.json",
          "agents/support.adl.json",
        ]);
        expect(fs.existsSync(path.join(dir, "gen/billing/types.ts"))).toBe(true);
        expect(fs.existsSync(path.join(dir, "gen/support/types.ts"))).toBe(true);

        // Re-run is a clean overwrite (idempotent build step).
        expect(run(["generate", "--json"], undefined, dir).code).toBe(0);
        expect(fs.existsSync(path.join(dir, "gen/billing/types.ts"))).toBe(true);
      } finally {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    });

    test("clean:true removes stale files from the output dir", () => {
      const dir = makeProject();
      try {
        run(["generate"], undefined, dir);
        const stale = path.join(dir, "gen/billing/STALE.ts");
        fs.writeFileSync(stale, "// left over from an old spec");
        run(["generate"], undefined, dir); // billing entry has clean:true
        expect(fs.existsSync(stale)).toBe(false); // wiped
        expect(fs.existsSync(path.join(dir, "gen/billing/types.ts"))).toBe(true);
      } finally {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    });

    test("--dry-run writes nothing", () => {
      const dir = makeProject();
      try {
        const r = run(["generate", "--dry-run"], undefined, dir);
        expect(r.code).toBe(0);
        expect(fs.existsSync(path.join(dir, "gen"))).toBe(false);
      } finally {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    });

    test("missing config gives an actionable error", () => {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), "adl-nocfg-"));
      try {
        const r = run(["generate"], undefined, dir);
        expect(r.code).not.toBe(0);
        expect(r.stderr).toContain("adl.config.json");
      } finally {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    });
  });

  describe("scaffold + continuous generate (role-aware)", () => {
    function project(): string {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), "adl-scaffold-"));
      fs.writeFileSync(path.join(dir, "agent.adl.json"), MINIMAL_DOC);
      return dir;
    }

    test("scaffold writes the full framework and emits config marking managed files", () => {
      const dir = project();
      try {
        const r = run(
          ["scaffold", "agent.adl.json", "--target", "vanilla-ts", "--output", "src/agent", "--json"],
          undefined,
          dir,
        );
        expect(r.code).toBe(0);
        const out = JSON.parse(r.stdout);
        // types.ts is spec-derived (managed); agent.ts is business logic (scaffold)
        expect(out.regenerate).toContain("types.ts");
        expect(out.regenerate).not.toContain("agent.ts");

        // full framework written
        for (const f of ["types.ts", "agent.ts", "package.json"]) {
          expect(fs.existsSync(path.join(dir, "src/agent", f))).toBe(true);
        }
        // config emitted with the managed globs
        const cfg = JSON.parse(fs.readFileSync(path.join(dir, "adl.config.json"), "utf-8"));
        expect(cfg.generate[0].regenerate).toEqual(["types.ts"]);
      } finally {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    });

    test("generate regenerates managed files but preserves edited scaffold files", () => {
      const dir = project();
      try {
        run(["scaffold", "agent.adl.json", "--target", "vanilla-ts", "--output", "src/agent"], undefined, dir);

        const agentPath = path.join(dir, "src/agent/agent.ts");
        const typesPath = path.join(dir, "src/agent/types.ts");
        // user edits business logic; someone scribbles in the managed file
        fs.appendFileSync(agentPath, "\n// MY BUSINESS LOGIC\n");
        fs.appendFileSync(typesPath, "\n// stray edit\n");

        const r = run(["generate"], undefined, dir);
        expect(r.code).toBe(0);

        // scaffold edit preserved, managed file overwritten back to generated form
        expect(fs.readFileSync(agentPath, "utf-8")).toContain("MY BUSINESS LOGIC");
        expect(fs.readFileSync(typesPath, "utf-8")).not.toContain("stray edit");
      } finally {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    });

    test("re-scaffold keeps edited scaffold files unless --force", () => {
      const dir = project();
      try {
        run(["scaffold", "agent.adl.json", "--target", "vanilla-ts", "--output", "src/agent"], undefined, dir);
        const agentPath = path.join(dir, "src/agent/agent.ts");
        fs.appendFileSync(agentPath, "\n// EDIT\n");

        // second scaffold without --force preserves the edit
        run(["scaffold", "agent.adl.json", "--target", "vanilla-ts", "--output", "src/agent"], undefined, dir);
        expect(fs.readFileSync(agentPath, "utf-8")).toContain("EDIT");

        // with --force it overwrites the scaffold file
        run(["scaffold", "agent.adl.json", "--target", "vanilla-ts", "--output", "src/agent", "--force"], undefined, dir);
        expect(fs.readFileSync(agentPath, "utf-8")).not.toContain("EDIT");
      } finally {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    });
  });
});
