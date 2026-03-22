import * as fs from "node:fs";
import * as path from "node:path";
import { Command } from "commander";
import chalk from "chalk";
import { loadDocument } from "../core/loader.js";
import { validateDocument } from "../core/validator.js";
import { formatErrorsTerminal } from "../core/errors.js";
import { generateAgent, listTargets } from "@adl-spec/generator";
import type { ADLDocument } from "@adl-spec/core";

export function registerGenerateCommand(program: Command): void {
  program
    .command("generate")
    .description("Generate agent code from an ADL document")
    .argument("[file]", "ADL document file to generate from")
    .option("--target <targets...>", "Target framework(s) to generate for")
    .option("--output <dir>", "Output directory", "./generated")
    .option("--list-targets", "List all available generation targets")
    .action(
      async (
        file: string | undefined,
        opts: { target?: string[]; output: string; listTargets?: boolean },
      ) => {
        if (opts.listTargets) {
          const targets = listTargets();
          console.log(chalk.bold("Available targets:\n"));
          for (const t of targets) {
            console.log(
              `  ${chalk.cyan(t.id.padEnd(20))} ${t.label} (${t.outputLanguage})`,
            );
          }
          return;
        }

        if (!file) {
          console.error("Error: file argument is required");
          process.exit(1);
        }

        if (!opts.target || opts.target.length === 0) {
          console.error(
            'Error: --target is required. Use --list-targets to see available targets.',
          );
          process.exit(1);
        }

        // Load document
        const { data, errors: loadErrors } = loadDocument(file);
        if (loadErrors.length > 0) {
          console.error(formatErrorsTerminal(file, loadErrors));
          process.exit(1);
        }

        const doc = data as Record<string, unknown>;

        // Validate first
        const validationErrors = validateDocument(doc);
        if (validationErrors.length > 0) {
          console.error(formatErrorsTerminal(file, validationErrors));
          process.exit(1);
        }

        // Generate for each target
        for (const targetId of opts.target) {
          try {
            const result = generateAgent(doc as unknown as ADLDocument, {
              target: targetId,
            });

            const targetDir = opts.target.length > 1
              ? path.join(opts.output, targetId)
              : opts.output;

            // Write generated files
            for (const genFile of result.files) {
              const outputPath = path.join(targetDir, genFile.path);
              const dir = path.dirname(outputPath);
              if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
              }
              fs.writeFileSync(outputPath, genFile.content);
            }

            console.log(
              chalk.green("✓") +
                ` Generated ${chalk.bold(targetId)} → ${chalk.dim(targetDir)} (${result.files.length} files)`,
            );
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            console.error(
              chalk.red("✗") +
                ` Failed to generate ${chalk.bold(targetId)}: ${message}`,
            );
            process.exit(1);
          }
        }
      },
    );
}
