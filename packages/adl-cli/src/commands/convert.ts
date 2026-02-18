import * as fs from "node:fs";
import { Command } from "commander";
import { loadDocument } from "../core/loader.js";
import { validateDocument } from "../core/validator.js";
import { formatErrorsTerminal } from "../core/errors.js";
import { convertToA2A } from "../converters/a2a.js";
import { convertToMCP } from "../converters/mcp.js";

export function registerConvertCommand(program: Command): void {
  program
    .command("convert")
    .description("Convert an ADL document to A2A or MCP format")
    .argument("<file>", "ADL document file to convert")
    .requiredOption("--to <format>", "Target format: a2a or mcp")
    .option("--output <file>", "Write output to file instead of stdout")
    .action(
      async (
        file: string,
        opts: { to: string; output?: string },
      ) => {
        const format = opts.to.toLowerCase();
        if (format !== "a2a" && format !== "mcp") {
          console.error(
            `Error: --to must be "a2a" or "mcp", got "${opts.to}"`,
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

        // Convert
        let result: Record<string, unknown>;
        if (format === "a2a") {
          result = convertToA2A(doc);
        } else {
          result = convertToMCP(doc);
        }

        const output = JSON.stringify(result, null, 2) + "\n";

        if (opts.output) {
          fs.writeFileSync(opts.output, output);
          console.error(`Wrote ${format.toUpperCase()} output to ${opts.output}`);
        } else {
          process.stdout.write(output);
        }
      },
    );
}
