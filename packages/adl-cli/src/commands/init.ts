import * as fs from "node:fs";
import { Command } from "commander";
import chalk from "chalk";

const TEMPLATES: Record<string, Record<string, unknown>> = {
  minimal: {
    $schema: "https://adl-spec.org/0.3/schema.json",
    adl_spec: "0.3.0",
    name: "my-agent",
    description: "Describe your agent's purpose and capabilities.",
    version: "0.1.0",
    data_classification: {
      sensitivity: "internal",
    },
  },

  full: {
    $schema: "https://adl-spec.org/0.3/schema.json",
    adl_spec: "0.3.0",
    name: "my-agent",
    description: "Describe your agent's purpose and capabilities.",
    version: "0.1.0",
    data_classification: {
      sensitivity: "internal",
    },
    lifecycle: {
      status: "draft",
    },
    provider: {
      name: "Your Organization",
      url: "https://example.com",
      contact: "team@example.com",
    },
    model: {
      provider: "your-provider",
      name: "model-name",
      capabilities: ["function_calling"],
    },
    tools: [
      {
        name: "example_tool",
        description: "An example tool",
        parameters: {
          type: "object",
          properties: {
            input: { type: "string" },
          },
          required: ["input"],
        },
      },
    ],
    permissions: {
      network: {
        allowed_hosts: [],
        allowed_protocols: ["https"],
      },
    },
    security: {
      authentication: {
        type: "none",
      },
    },
    metadata: {
      authors: [{ name: "Your Name", email: "you@example.com" }],
      license: "Apache-2.0",
      tags: [],
    },
  },

  governance: {
    $schema: "https://adl-spec.org/0.3/schema.json",
    adl_spec: "0.3.0",
    name: "my-governed-agent",
    description: "An agent with governance profile for compliance requirements.",
    version: "0.1.0",
    data_classification: {
      sensitivity: "confidential",
    },
    profiles: ["urn:adl:profile:governance:1.0"],
    lifecycle: {
      status: "draft",
    },
    provider: {
      name: "Your Organization",
      url: "https://example.com",
      contact: "compliance@example.com",
    },
    model: {
      capabilities: ["function_calling"],
    },
    tools: [
      {
        name: "example_tool",
        description: "An example tool",
        parameters: {
          type: "object",
          properties: {
            input: { type: "string" },
          },
          required: ["input"],
        },
        read_only: true,
      },
    ],
    permissions: {
      network: {
        allowed_hosts: [],
        allowed_protocols: ["https"],
        deny_private: true,
      },
      filesystem: {
        allowed_paths: [],
      },
    },
    security: {
      authentication: {
        type: "oauth2",
        required: true,
        scopes: [],
      },
      encryption: {
        in_transit: {
          required: true,
          min_version: "1.2",
        },
      },
    },
    metadata: {
      authors: [{ name: "Compliance Team", email: "compliance@example.com" }],
      license: "Proprietary",
      tags: ["governance", "compliance"],
    },
  },
};

export function registerInitCommand(program: Command): void {
  program
    .command("init")
    .description("Scaffold a new ADL document")
    .option(
      "--template <name>",
      `Template: ${Object.keys(TEMPLATES).join(", ")}`,
      "minimal",
    )
    .option("--output <file>", "Output file path", "agent.adl.json")
    .option("--force", "Overwrite the output file if it already exists")
    .option("--dry-run", "Print the document to stdout without writing a file")
    .option("--json", "Emit a machine-readable result object")
    .action(
      async (opts: {
        template: string;
        output: string;
        force?: boolean;
        dryRun?: boolean;
        json?: boolean;
      }) => {
        const templateName = opts.template.toLowerCase();
        const template = TEMPLATES[templateName];

        if (!template) {
          const names = Object.keys(TEMPLATES).join(", ");
          console.error(
            `Error: unknown template "${opts.template}". Available: ${names}.\n` +
              `  adl init --template ${Object.keys(TEMPLATES)[0]} --output agent.adl.json`,
          );
          process.exit(1);
        }

        const content = JSON.stringify(template, null, 2) + "\n";

        // --dry-run: preview to stdout, never touch the filesystem.
        if (opts.dryRun) {
          if (opts.json) {
            process.stdout.write(
              JSON.stringify(
                { wrote: false, dryRun: true, output: opts.output, template: templateName },
                null,
                2,
              ) + "\n",
            );
          } else {
            process.stdout.write(content);
          }
          return;
        }

        const exists = fs.existsSync(opts.output);
        if (exists && !opts.force) {
          console.error(
            `Error: ${opts.output} already exists. Re-run with --force to overwrite, ` +
              `or pass --output <file> to write elsewhere.`,
          );
          process.exit(1);
        }

        fs.writeFileSync(opts.output, content);

        if (opts.json) {
          process.stdout.write(
            JSON.stringify(
              { wrote: true, output: opts.output, template: templateName, overwritten: exists },
              null,
              2,
            ) + "\n",
          );
        } else {
          console.log(
            chalk.green("✓") +
              ` ${exists ? "Overwrote" : "Created"} ${chalk.bold(opts.output)} (template: ${templateName})`,
          );
        }
      },
    )
    .addHelpText(
      "after",
      `
Examples:
  adl init
  adl init --template governance --output governed-agent.adl.json
  adl init --template full --force
  adl init --template minimal --dry-run > agent.adl.json
  adl init --template minimal --dry-run --json`,
    );
}
