import * as fs from "node:fs";
import * as path from "node:path";
import { Command } from "commander";
import chalk from "chalk";
import { validateDocument } from "../core/validator.js";
import { formatErrorsTerminal } from "../core/errors.js";
import { loadInput } from "../core/input.js";
import {
  DEFAULT_CONFIG_FILE,
  upsertGenerateEntry,
} from "../core/config.js";
import { generateAgent, loadFormatterPlugins } from "@adl-spec/generator";
import type { ADLDocument } from "@adl-spec/core";

interface ScaffoldOpts {
  target: string;
  output: string;
  plugin?: string[];
  config?: string;
  force?: boolean;
  json?: boolean;
}

function fail(message: string): never {
  console.error(chalk.red("✗") + " " + message);
  process.exit(1);
}

export function registerScaffoldCommand(program: Command): void {
  program
    .command("scaffold")
    .description(
      "One-time: generate the full framework and write adl.config.json so " +
        "future `adl generate` runs only regenerate the managed (spec-derived) files",
    )
    .argument("<file>", 'ADL document file; use "-" to read from stdin')
    .requiredOption("--target <id>", "Target framework to scaffold")
    .requiredOption("--output <dir>", "Output directory for the framework")
    .option("--plugin <modules...>", "Formatter plugin module(s) to load")
    .option("--config <file>", "Config file to write/update", DEFAULT_CONFIG_FILE)
    .option("--force", "Overwrite scaffold (business-logic) files if present")
    .option("--json", "Emit machine-readable JSON results")
    .action(async (file: string, opts: ScaffoldOpts) => {
      if (opts.plugin && opts.plugin.length > 0) {
        try {
          await loadFormatterPlugins(opts.plugin, { baseDir: process.cwd() });
        } catch (err) {
          fail(`Failed to load plugin: ${err instanceof Error ? err.message : String(err)}`);
        }
      }

      const { data, errors: loadErrors, source } = loadInput(file);
      if (loadErrors.length > 0) {
        console.error(formatErrorsTerminal(source, loadErrors));
        process.exit(1);
      }
      const doc = data as Record<string, unknown>;
      const validationErrors = validateDocument(doc);
      if (validationErrors.length > 0) {
        console.error(formatErrorsTerminal(source, validationErrors));
        process.exit(1);
      }

      let files;
      try {
        files = generateAgent(doc as unknown as ADLDocument, {
          target: opts.target,
        }).files;
      } catch (err) {
        fail(err instanceof Error ? err.message : String(err));
      }

      const written: { path: string; role: string; action: string }[] = [];
      const managedGlobs: string[] = [];
      for (const genFile of files) {
        const role = genFile.role === "managed" ? "managed" : "scaffold";
        if (role === "managed") managedGlobs.push(genFile.path);

        const outputPath = path.join(opts.output, genFile.path);
        const exists = fs.existsSync(outputPath);
        // managed always written; scaffold written unless it exists (keep edits)
        const willWrite = role === "managed" || !exists || !!opts.force;
        if (willWrite) {
          fs.mkdirSync(path.dirname(outputPath), { recursive: true });
          fs.writeFileSync(outputPath, genFile.content);
        }
        written.push({
          path: outputPath,
          role,
          action: willWrite ? "written" : "skipped",
        });
      }

      // Emit the config so `adl generate` continuously regenerates the managed
      // (spec-derived) files while leaving scaffold business logic alone.
      const configPath = path.resolve(opts.config ?? DEFAULT_CONFIG_FILE);
      const { created } = upsertGenerateEntry(configPath, {
        source: file,
        target: opts.target,
        output: opts.output,
        regenerate: managedGlobs,
      });

      if (opts.json) {
        process.stdout.write(
          JSON.stringify(
            {
              target: opts.target,
              output: opts.output,
              config: path.relative(process.cwd(), configPath),
              configCreated: created,
              regenerate: managedGlobs,
              files: written,
            },
            null,
            2,
          ) + "\n",
        );
        return;
      }

      const wrote = written.filter((f) => f.action === "written").length;
      const kept = written.length - wrote;
      console.log(
        chalk.green("✓") +
          ` Scaffolded ${chalk.bold(opts.target)} → ${chalk.dim(opts.output)} ` +
          `(${wrote} files${kept ? `, ${kept} kept` : ""})`,
      );
      console.log(
        chalk.green("✓") +
          ` ${created ? "Created" : "Updated"} ${chalk.bold(path.relative(process.cwd(), configPath))} ` +
          `— ${managedGlobs.length} managed file(s) will regenerate on \`adl generate\``,
      );
      console.log(
        chalk.dim(
          "  Gitignore the output dir and run `adl generate` as a prebuild step.",
        ),
      );
    })
    .addHelpText(
      "after",
      `
Examples:
  adl scaffold agent.adl.json --target vanilla-ts --output src/agent
  adl scaffold agent.adl.json --target acme-go --output internal/agent --plugin @acme/adl-target-go

After scaffolding, edit the business-logic files (e.g. agent.ts); run
'adl generate' to refresh only the managed files (types, interfaces).`,
    );
}
