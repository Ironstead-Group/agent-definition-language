import * as fs from "node:fs";
import * as path from "node:path";
import { Command } from "commander";
import chalk from "chalk";
import { validateDocument } from "../core/validator.js";
import { formatErrorsTerminal } from "../core/errors.js";
import { loadInput } from "../core/input.js";
import {
  assertSafeCleanTarget,
  loadConfig,
  matchesGlobs,
  type GenerateEntry,
} from "../core/config.js";
import {
  generateAgent,
  listTargets,
  loadFormatterPlugins,
} from "@adl-spec/generator";
import type { ADLDocument } from "@adl-spec/core";

interface GenerateOpts {
  target?: string[];
  plugin?: string[];
  output: string;
  config?: string;
  clean?: boolean;
  listTargets?: boolean;
  dryRun?: boolean;
  json?: boolean;
}

interface WrittenFile {
  path: string;
  role: "managed" | "scaffold";
  action: "written" | "skipped";
}

interface EntryResult {
  source: string;
  target: string;
  output: string;
  files: WrittenFile[];
}

function fail(message: string): never {
  console.error(chalk.red("✗") + " " + message);
  process.exit(1);
}

/** Load + validate a document once, exiting on error. Cached by source path. */
function loadValidated(
  source: string,
  cache: Map<string, ADLDocument>,
): ADLDocument {
  const cached = cache.get(source);
  if (cached) return cached;

  const { data, errors: loadErrors, source: label } = loadInput(source);
  if (loadErrors.length > 0) {
    console.error(formatErrorsTerminal(label, loadErrors));
    process.exit(1);
  }
  const doc = data as Record<string, unknown>;
  const validationErrors = validateDocument(doc);
  if (validationErrors.length > 0) {
    console.error(formatErrorsTerminal(label, validationErrors));
    process.exit(1);
  }
  const typed = doc as unknown as ADLDocument;
  cache.set(source, typed);
  return typed;
}

/** Run a list of generation entries, writing (overwriting) or previewing. */
function runEntries(entries: GenerateEntry[], opts: GenerateOpts): EntryResult[] {
  const cache = new Map<string, ADLDocument>();
  const results: EntryResult[] = [];

  for (const entry of entries) {
    const doc = loadValidated(entry.source, cache);
    let files;
    try {
      files = generateAgent(doc, { target: entry.target }).files;
    } catch (err) {
      fail(
        `Failed to generate ${chalk.bold(entry.target)} from ${entry.source}: ` +
          (err instanceof Error ? err.message : String(err)),
      );
    }

    const shouldClean = entry.clean || opts.clean;
    if (shouldClean && !opts.dryRun) {
      assertSafeCleanTarget(entry.output);
      fs.rmSync(entry.output, { recursive: true, force: true });
    }

    // A file is "managed" (overwritten every run) if it matches the entry's
    // regenerate globs, or — when no globs are configured — if the generator
    // tagged it managed. Everything else is scaffold: written once.
    const isManaged = (file: { path: string; role?: string }): boolean =>
      entry.regenerate
        ? matchesGlobs(file.path, entry.regenerate)
        : file.role === "managed";

    const writtenFiles: WrittenFile[] = [];
    for (const genFile of files) {
      const outputPath = path.join(entry.output, genFile.path);
      const role: "managed" | "scaffold" = isManaged(genFile) ? "managed" : "scaffold";
      const exists = fs.existsSync(outputPath);
      // managed → always overwrite; scaffold → write only if absent.
      const willWrite = role === "managed" || !exists;

      if (willWrite && !opts.dryRun) {
        fs.mkdirSync(path.dirname(outputPath), { recursive: true });
        fs.writeFileSync(outputPath, genFile.content);
      }
      writtenFiles.push({
        path: outputPath,
        role,
        action: willWrite ? "written" : "skipped",
      });
    }
    results.push({
      source: entry.source,
      target: entry.target,
      output: entry.output,
      files: writtenFiles,
    });

    if (!opts.json) {
      const verb = opts.dryRun ? "Would generate" : "Generated";
      const wrote = writtenFiles.filter((f) => f.action === "written").length;
      const kept = writtenFiles.length - wrote;
      const cleaned = shouldClean && !opts.dryRun ? chalk.dim(" (cleaned)") : "";
      const keptNote = kept > 0 ? chalk.dim(` (${kept} scaffold kept)`) : "";
      console.log(
        chalk.green(opts.dryRun ? "•" : "✓") +
          ` ${verb} ${chalk.bold(entry.target)} from ${chalk.dim(entry.source)} → ${chalk.dim(entry.output)} (${wrote} files)${keptNote}${cleaned}`,
      );
      if (opts.dryRun) {
        for (const f of writtenFiles) {
          const tag = f.action === "written" ? f.role : "skip";
          console.log(`    ${chalk.dim(`[${tag}]`)} ${chalk.dim(f.path)}`);
        }
      }
    }
  }

  return results;
}

async function loadPlugins(specifiers: string[]): Promise<void> {
  if (specifiers.length === 0) return;
  try {
    await loadFormatterPlugins(specifiers, { baseDir: process.cwd() });
  } catch (err) {
    fail(`Failed to load plugin: ${err instanceof Error ? err.message : String(err)}`);
  }
}

export function registerGenerateCommand(program: Command): void {
  program
    .command("generate")
    .description(
      "Generate agent code from an ADL document, or from adl.config.json",
    )
    .argument("[file]", 'ADL document file; use "-" to read from stdin')
    .option("--target <targets...>", "Target framework(s) to generate for")
    .option("--plugin <modules...>", "Formatter plugin module(s) to load")
    .option("--output <dir>", "Output directory", "./generated")
    .option("--config <file>", "Path to a config file (default: adl.config.json)")
    .option("--clean", "Wipe each output directory before writing")
    .option("--list-targets", "List all available generation targets")
    .option("--dry-run", "List files that would be generated without writing them")
    .option("--json", "Emit machine-readable JSON results")
    .action(async (file: string | undefined, opts: GenerateOpts) => {
      await loadPlugins(opts.plugin ?? []);

      if (opts.listTargets) {
        const targets = listTargets();
        if (opts.json) {
          process.stdout.write(JSON.stringify({ targets }, null, 2) + "\n");
          return;
        }
        console.log(chalk.bold("Available targets:\n"));
        for (const t of targets) {
          console.log(
            `  ${chalk.cyan(t.id.padEnd(20))} ${t.label} (${t.outputLanguage})`,
          );
        }
        return;
      }

      // Config-driven mode: no explicit file/target → read adl.config.json.
      const useConfig = !file && (!opts.target || opts.target.length === 0);
      let entries: GenerateEntry[];

      if (useConfig) {
        let loaded;
        try {
          loaded = loadConfig(opts.config);
        } catch (err) {
          fail(err instanceof Error ? err.message : String(err));
        }
        await loadPlugins(loaded.config.plugins ?? []);
        entries = loaded.config.generate;
        if (!opts.json) {
          console.log(chalk.dim(`Using ${path.relative(process.cwd(), loaded.path)}`));
        }
      } else {
        // Explicit mode.
        if (!file) {
          fail(
            "file argument is required (or add adl.config.json).\n" +
              "  adl generate agent.adl.json --target vanilla-ts\n" +
              "  adl generate            # uses adl.config.json",
          );
        }
        if (!opts.target || opts.target.length === 0) {
          fail(
            "--target is required. Use --list-targets to see available targets.\n" +
              `  adl generate ${file} --target vanilla-ts`,
          );
        }
        const multi = opts.target.length > 1;
        entries = opts.target.map((target) => ({
          source: file,
          target,
          output: multi ? path.join(opts.output, target) : opts.output,
        }));
      }

      const results = runEntries(entries, opts);

      if (opts.json) {
        process.stdout.write(
          JSON.stringify({ dryRun: !!opts.dryRun, generated: results }, null, 2) + "\n",
        );
      }
    })
    .addHelpText(
      "after",
      `
Examples:
  adl generate --list-targets
  adl generate                                  # generate everything in adl.config.json
  adl generate --clean                          # same, wiping each output dir first
  adl generate agent.adl.json --target vanilla-ts
  adl generate agent.adl.json --target vanilla-ts --output ./out
  adl generate agent.adl.json --target vanilla-ts --dry-run
  cat agent.adl.json | adl generate - --target vanilla-ts --json

Config (adl.config.json):
  {
    "plugins": ["@acme/adl-target-go"],
    "generate": [
      { "source": "agents/billing.adl.json", "target": "vanilla-ts", "output": "src/gen/billing", "clean": true },
      { "source": "agents/support.adl.json", "target": "acme-go",    "output": "internal/support" }
    ]
  }
Generated output is a build artifact: gitignore it and run 'adl generate'
as a prebuild step so the spec stays the source of truth.`,
    );
}
