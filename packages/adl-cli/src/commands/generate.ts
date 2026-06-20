import * as fs from "node:fs";
import * as path from "node:path";
import { Command } from "commander";
import chalk from "chalk";
import { validateDocument } from "../core/validator.js";
import { formatErrorsTerminal } from "../core/errors.js";
import { loadInput } from "../core/input.js";
import {
  generateAgent,
  listTargets,
  loadFormatterPlugins,
} from "@adl-spec/generator";
import type { ADLDocument } from "@adl-spec/core";

export function registerGenerateCommand(program: Command): void {
  program
    .command("generate")
    .description("Generate agent code from an ADL document")
    .argument("[file]", 'ADL document file; use "-" to read from stdin')
    .option("--target <targets...>", "Target framework(s) to generate for")
    .option("--plugin <modules...>", "Formatter plugin module(s) to load")
    .option("--output <dir>", "Output directory", "./generated")
    .option("--list-targets", "List all available generation targets")
    .option("--dry-run", "List files that would be generated without writing them")
    .option("--json", "Emit machine-readable JSON results")
    .action(
      async (
        file: string | undefined,
        opts: {
          target?: string[];
          plugin?: string[];
          output: string;
          listTargets?: boolean;
          dryRun?: boolean;
          json?: boolean;
        },
      ) => {
        if (opts.plugin && opts.plugin.length > 0) {
          try {
            await loadFormatterPlugins(opts.plugin, {
              baseDir: process.cwd(),
            });
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            console.error(chalk.red("✗") + ` Failed to load plugin: ${message}`);
            process.exit(1);
          }
        }

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

        if (!file) {
          console.error(
            "Error: file argument is required.\n" +
              "  adl generate agent.adl.json --target typescript\n" +
              "  adl generate --list-targets",
          );
          process.exit(1);
        }

        if (!opts.target || opts.target.length === 0) {
          console.error(
            "Error: --target is required. Use --list-targets to see available targets.\n" +
              `  adl generate ${file} --target typescript`,
          );
          process.exit(1);
        }

        // Load document (file or stdin)
        const { data, errors: loadErrors, source } = loadInput(file);
        if (loadErrors.length > 0) {
          console.error(formatErrorsTerminal(source, loadErrors));
          process.exit(1);
        }

        const doc = data as Record<string, unknown>;

        // Validate first
        const validationErrors = validateDocument(doc);
        if (validationErrors.length > 0) {
          console.error(formatErrorsTerminal(source, validationErrors));
          process.exit(1);
        }

        // Generate for each target
        const generated: { target: string; dir: string; files: string[] }[] = [];
        for (const targetId of opts.target) {
          try {
            const result = generateAgent(doc as unknown as ADLDocument, {
              target: targetId,
            });

            const targetDir = opts.target.length > 1
              ? path.join(opts.output, targetId)
              : opts.output;

            const written: string[] = [];
            for (const genFile of result.files) {
              const outputPath = path.join(targetDir, genFile.path);
              written.push(outputPath);
              if (opts.dryRun) continue;
              const dir = path.dirname(outputPath);
              if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
              }
              fs.writeFileSync(outputPath, genFile.content);
            }
            generated.push({ target: targetId, dir: targetDir, files: written });

            if (!opts.json) {
              const verb = opts.dryRun ? "Would generate" : "Generated";
              console.log(
                chalk.green(opts.dryRun ? "•" : "✓") +
                  ` ${verb} ${chalk.bold(targetId)} → ${chalk.dim(targetDir)} (${written.length} files)`,
              );
              if (opts.dryRun) {
                for (const f of written) console.log(`    ${chalk.dim(f)}`);
              }
            }
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            console.error(
              chalk.red("✗") +
                ` Failed to generate ${chalk.bold(targetId)}: ${message}`,
            );
            process.exit(1);
          }
        }

        if (opts.json) {
          process.stdout.write(
            JSON.stringify({ dryRun: !!opts.dryRun, generated }, null, 2) + "\n",
          );
        }
      },
    )
    .addHelpText(
      "after",
      `
Examples:
  adl generate --list-targets
  adl generate agent.adl.json --target typescript
  adl generate agent.adl.json --target typescript python --output ./out
  adl generate agent.adl.json --target typescript --dry-run
  cat agent.adl.json | adl generate - --target typescript --json`,
    );
}
