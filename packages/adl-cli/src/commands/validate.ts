import { Command } from "commander";
import chalk from "chalk";
import { validateDocument } from "../core/validator.js";
import { formatErrorsTerminal, type ADLError } from "../core/errors.js";
import { loadInput } from "../core/input.js";

interface FileResult {
  file: string;
  valid: boolean;
  errors: ADLError[];
}

export function registerValidateCommand(program: Command): void {
  program
    .command("validate")
    .description("Validate ADL document(s) against the schema")
    .argument("<files...>", 'ADL document file(s); use "-" to read from stdin')
    .option("--json", "Emit machine-readable JSON results instead of text")
    .action(async (files: string[], opts: { json?: boolean }) => {
      const results: FileResult[] = [];

      for (const file of files) {
        const { data, errors: loadErrors, source } = loadInput(file);
        if (loadErrors.length > 0) {
          results.push({ file: source, valid: false, errors: loadErrors });
          continue;
        }
        const errors = validateDocument(data as Record<string, unknown>);
        results.push({ file: source, valid: errors.length === 0, errors });
      }

      const hasErrors = results.some((r) => !r.valid);

      if (opts.json) {
        process.stdout.write(
          JSON.stringify(
            { valid: !hasErrors, results },
            null,
            2,
          ) + "\n",
        );
      } else {
        for (const r of results) {
          if (r.valid) {
            console.log(chalk.green("✓") + " " + chalk.bold(r.file) + " is valid");
          } else {
            console.error(formatErrorsTerminal(r.file, r.errors));
          }
        }
      }

      if (hasErrors) process.exit(1);
    })
    .addHelpText(
      "after",
      `
Examples:
  adl validate agent.adl.json
  adl validate agents/*.adl.yaml
  cat agent.adl.json | adl validate -
  adl validate agent.adl.json --json`,
    );
}
