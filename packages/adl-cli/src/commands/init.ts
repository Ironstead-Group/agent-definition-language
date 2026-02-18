import * as fs from "node:fs";
import { Command } from "commander";
import chalk from "chalk";

const TEMPLATES: Record<string, Record<string, unknown>> = {
  minimal: {
    $schema: "https://adl-spec.org/0.1/schema.json",
    adl_spec: "0.1.0",
    name: "my-agent",
    description: "Describe your agent's purpose and capabilities.",
    version: "0.1.0",
  },

  full: {
    $schema: "https://adl-spec.org/0.1/schema.json",
    adl_spec: "0.1.0",
    name: "my-agent",
    description: "Describe your agent's purpose and capabilities.",
    version: "0.1.0",
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
    $schema: "https://adl-spec.org/0.1/schema.json",
    adl_spec: "0.1.0",
    name: "my-governed-agent",
    description: "An agent with governance profile for compliance requirements.",
    version: "0.1.0",
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
      "Template: minimal, full, or governance",
      "minimal",
    )
    .option("--output <file>", "Output file path", "agent.adl.json")
    .action(async (opts: { template: string; output: string }) => {
      const templateName = opts.template.toLowerCase();
      const template = TEMPLATES[templateName];

      if (!template) {
        console.error(
          `Error: Unknown template "${opts.template}". Available: ${Object.keys(TEMPLATES).join(", ")}`,
        );
        process.exit(1);
      }

      if (fs.existsSync(opts.output)) {
        console.error(
          `Error: ${opts.output} already exists. Use --output to specify a different path.`,
        );
        process.exit(1);
      }

      const content = JSON.stringify(template, null, 2) + "\n";
      fs.writeFileSync(opts.output, content);
      console.log(
        chalk.green("✓") +
          ` Created ${chalk.bold(opts.output)} (template: ${templateName})`,
      );
    });
}
