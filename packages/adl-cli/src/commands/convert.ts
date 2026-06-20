import * as fs from "node:fs";
import { Command } from "commander";
import { validateDocument } from "../core/validator.js";
import { formatErrorsTerminal } from "../core/errors.js";
import { loadInput } from "../core/input.js";
import { convertToA2A } from "../converters/a2a.js";
import { convertToMCP } from "../converters/mcp.js";

export function registerConvertCommand(program: Command): void {
  program
    .command("convert")
    .description("Convert an ADL document to A2A or MCP format")
    .argument("<file>", 'ADL document file; use "-" to read from stdin')
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
            `Error: --to must be "a2a" or "mcp", got "${opts.to}".\n` +
              `  adl convert ${file} --to a2a\n` +
              `  adl convert ${file} --to mcp`,
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
    )
    .addHelpText(
      "after",
      `
Examples:
  adl convert agent.adl.json --to a2a
  adl convert agent.adl.json --to mcp --output agent.mcp.json
  cat agent.adl.json | adl convert - --to a2a | jq .name`,
    );
}
