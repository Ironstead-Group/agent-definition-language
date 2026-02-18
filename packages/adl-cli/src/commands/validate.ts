import { Command } from "commander";
import chalk from "chalk";
import { loadDocument } from "../core/loader.js";
import { validateDocument } from "../core/validator.js";
import { formatErrorsTerminal, type ADLError } from "../core/errors.js";

export function registerValidateCommand(program: Command): void {
  program
    .command("validate")
    .description("Validate ADL document(s) against the schema")
    .argument("<files...>", "ADL document file(s) to validate")
    .action(async (files: string[]) => {
      let hasErrors = false;

      for (const file of files) {
        const { data, errors: loadErrors } = loadDocument(file);

        if (loadErrors.length > 0) {
          console.error(formatErrorsTerminal(file, loadErrors));
          hasErrors = true;
          continue;
        }

        const validationErrors = validateDocument(
          data as Record<string, unknown>,
        );

        if (validationErrors.length > 0) {
          console.error(formatErrorsTerminal(file, validationErrors));
          hasErrors = true;
        } else {
          console.log(
            chalk.green("✓") + " " + chalk.bold(file) + " is valid",
          );
        }
      }

      if (hasErrors) {
        process.exit(1);
      }
    });
}
