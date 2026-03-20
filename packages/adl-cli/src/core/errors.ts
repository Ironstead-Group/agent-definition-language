/**
 * Re-export error types from @adl-spec/core + CLI-specific terminal formatter.
 */

import chalk from "chalk";

export type {
  ADLError,
  ADLErrorSource,
  ADLErrorReport,
} from "@adl-spec/core";

export {
  ADL_ERRORS,
  createError,
  formatErrorsJSON,
} from "@adl-spec/core";

import type { ADLError } from "@adl-spec/core";

export function formatErrorsTerminal(
  file: string,
  errors: ADLError[],
): string {
  const lines: string[] = [];
  lines.push(chalk.bold.underline(file));

  for (const err of errors) {
    const location = err.source?.pointer
      ? chalk.dim(` at ${err.source.pointer}`)
      : "";
    const code = chalk.yellow(err.code);
    const title = chalk.red(err.title);
    lines.push(`  ${code} ${title}${location}`);
    lines.push(`    ${chalk.dim(err.detail)}`);
  }

  lines.push("");
  const count = errors.length;
  lines.push(
    chalk.red.bold(`\u2716 ${count} error${count !== 1 ? "s" : ""} found`),
  );

  return lines.join("\n");
}
