/**
 * Code templates for the Claude Agent SDK TypeScript target.
 */

import type { AgentIR, ToolIR } from "../../ir/types.js";
import {
  jsonSchemaToInterface,
  jsonSchemaToType,
} from "../../utils/json-schema-to-type.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function pascalCase(name: string): string {
  return name
    .split(/[_\-\s]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join("");
}

function camelCase(name: string): string {
  const pascal = pascalCase(name);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

function escapeStr(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$/g, "\\$");
}

// ---------------------------------------------------------------------------
// types.ts
// ---------------------------------------------------------------------------

export function renderTypes(ir: AgentIR): string {
  const lines: string[] = [
    "/**",
    ` * Generated TypeScript types for ${ir.identity.name}`,
    " */",
    "",
  ];

  for (const tool of ir.tools) {
    if (tool.parameters) {
      const interfaceName = `${pascalCase(tool.name)}Params`;
      lines.push(jsonSchemaToInterface(interfaceName, tool.parameters));
      lines.push("");
    }

    if (tool.returns) {
      const returnType = jsonSchemaToType(tool.returns);
      lines.push(`export type ${pascalCase(tool.name)}Result = ${returnType};`);
      lines.push("");
    }
  }

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// tools.ts
// ---------------------------------------------------------------------------

export function renderTools(ir: AgentIR): string {
  const lines: string[] = [
    "/**",
    ` * Tool implementations for ${ir.identity.name}`,
    " */",
    "",
  ];

  // Import parameter types
  const paramImports = ir.tools
    .filter((t) => t.parameters)
    .map((t) => `${pascalCase(t.name)}Params`);
  const returnImports = ir.tools
    .filter((t) => t.returns)
    .map((t) => `${pascalCase(t.name)}Result`);
  const allImports = [...paramImports, ...returnImports];

  if (allImports.length > 0) {
    lines.push(`import type { ${allImports.join(", ")} } from "./types.js";`);
    lines.push("");
  }

  for (const tool of ir.tools) {
    const fnName = camelCase(tool.name);
    const paramType = tool.parameters
      ? `${pascalCase(tool.name)}Params`
      : undefined;
    const returnType = tool.returns
      ? `${pascalCase(tool.name)}Result`
      : "unknown";

    lines.push(`/**`);
    lines.push(` * ${tool.description}`);
    if (tool.readOnly) lines.push(` * @readonly`);
    if (tool.idempotent) lines.push(` * @idempotent`);
    if (tool.requiresConfirmation)
      lines.push(` * @requiresConfirmation`);
    lines.push(` */`);

    const paramSig = paramType ? `params: ${paramType}` : "";
    lines.push(
      `export async function ${fnName}(${paramSig}): Promise<${returnType}> {`,
    );
    lines.push(
      `  // TODO: Implement ${tool.name}`,
    );
    lines.push(`  throw new Error("Not implemented: ${tool.name}");`);
    lines.push(`}`);
    lines.push("");
  }

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// agent.ts
// ---------------------------------------------------------------------------

export function renderAgent(ir: AgentIR): string {
  const lines: string[] = [];

  lines.push("/**");
  lines.push(` * ${ir.identity.name} — Claude Agent SDK agent`);
  lines.push(` * ${ir.identity.description}`);
  lines.push(` * Version: ${ir.identity.version}`);
  lines.push(" */");
  lines.push("");
  lines.push('import Anthropic from "@anthropic-ai/sdk";');

  // Import tool functions
  if (ir.tools.length > 0) {
    const toolImports = ir.tools.map((t) => camelCase(t.name));
    lines.push(`import { ${toolImports.join(", ")} } from "./tools.js";`);
  }

  // Import param types for tool definitions
  const paramTypeImports = ir.tools
    .filter((t) => t.parameters)
    .map((t) => `${pascalCase(t.name)}Params`);
  if (paramTypeImports.length > 0) {
    lines.push(
      `import type { ${paramTypeImports.join(", ")} } from "./types.js";`,
    );
  }

  lines.push("");

  // Model config
  const model = ir.model;
  const modelName = model?.name ?? "claude-sonnet-4-20250514";
  lines.push(`const MODEL = "${modelName}";`);

  if (model?.temperature !== undefined) {
    lines.push(`const TEMPERATURE = ${model.temperature};`);
  }
  if (model?.maxTokens !== undefined) {
    lines.push(`const MAX_TOKENS = ${model.maxTokens};`);
  } else {
    lines.push("const MAX_TOKENS = 4096;");
  }

  lines.push("");

  // System prompt
  if (ir.systemPrompt) {
    lines.push(
      `const SYSTEM_PROMPT = \`${escapeStr(ir.systemPrompt)}\`;`,
    );
    lines.push("");
  }

  // Permission comments
  renderPermissionComments(ir, lines);

  // Tool definitions
  if (ir.tools.length > 0) {
    lines.push("const TOOLS: Anthropic.Tool[] = [");
    for (const tool of ir.tools) {
      lines.push("  {");
      lines.push(`    name: "${tool.name}",`);
      lines.push(
        `    description: "${tool.description.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}",`,
      );
      lines.push('    input_schema: {');
      lines.push('      type: "object" as const,');
      if (tool.parameters) {
        const props = (tool.parameters as Record<string, unknown>)
          .properties;
        const required = (tool.parameters as Record<string, unknown>)
          .required;
        if (props) {
          lines.push(
            `      properties: ${JSON.stringify(props, null, 6).replace(/\n/g, "\n      ")},`,
          );
        }
        if (required) {
          lines.push(
            `      required: ${JSON.stringify(required)},`,
          );
        }
      }
      lines.push("    },");
      lines.push("  },");
    }
    lines.push("];");
    lines.push("");
  }

  // Tool dispatch map
  if (ir.tools.length > 0) {
    lines.push(
      "const TOOL_HANDLERS: Record<string, (input: Record<string, unknown>) => Promise<unknown>> = {",
    );
    for (const tool of ir.tools) {
      const fnName = camelCase(tool.name);
      lines.push(
        `  "${tool.name}": (input) => ${fnName}(input as any),`,
      );
    }
    lines.push("};");
    lines.push("");
  }

  // Main run function
  lines.push("export async function runAgent(userMessage: string) {");
  lines.push("  const client = new Anthropic();");
  lines.push("");
  lines.push("  const messages: Anthropic.MessageParam[] = [");
  lines.push('    { role: "user", content: userMessage },');
  lines.push("  ];");
  lines.push("");
  lines.push("  // Agentic tool-use loop");
  lines.push("  while (true) {");
  lines.push("    const response = await client.messages.create({");
  lines.push("      model: MODEL,");
  lines.push("      max_tokens: MAX_TOKENS,");
  if (model?.temperature !== undefined) {
    lines.push("      temperature: TEMPERATURE,");
  }
  if (ir.systemPrompt) {
    lines.push("      system: SYSTEM_PROMPT,");
  }
  lines.push("      messages,");
  if (ir.tools.length > 0) {
    lines.push("      tools: TOOLS,");
  }
  lines.push("    });");
  lines.push("");
  lines.push('    if (response.stop_reason === "end_turn") {');
  lines.push("      return response.content;");
  lines.push("    }");
  lines.push("");

  if (ir.tools.length > 0) {
    lines.push('    if (response.stop_reason === "tool_use") {');
    lines.push(
      '      const toolUseBlocks = response.content.filter((b) => b.type === "tool_use");',
    );
    lines.push(
      "      messages.push({ role: \"assistant\", content: response.content });",
    );
    lines.push("");
    lines.push(
      "      const toolResults: Anthropic.ToolResultBlockParam[] = [];",
    );
    lines.push("      for (const toolUse of toolUseBlocks) {");
    lines.push(
      '        if (toolUse.type !== "tool_use") continue;',
    );
    lines.push(
      "        const handler = TOOL_HANDLERS[toolUse.name];",
    );
    lines.push("        if (!handler) {");
    lines.push("          toolResults.push({");
    lines.push('            type: "tool_result",');
    lines.push("            tool_use_id: toolUse.id,");
    lines.push(
      "            content: `Unknown tool: ${toolUse.name}`,",
    );
    lines.push("            is_error: true,");
    lines.push("          });");
    lines.push("          continue;");
    lines.push("        }");
    lines.push("        try {");
    lines.push(
      "          const result = await handler(toolUse.input as Record<string, unknown>);",
    );
    lines.push("          toolResults.push({");
    lines.push('            type: "tool_result",');
    lines.push("            tool_use_id: toolUse.id,");
    lines.push("            content: JSON.stringify(result),");
    lines.push("          });");
    lines.push("        } catch (error) {");

    // Error handling based on runtime config
    const errorAction = ir.runtime.errorHandling.onToolError;
    if (errorAction === "retry") {
      lines.push(
        `          // Error policy: retry (max ${ir.runtime.errorHandling.maxRetries})`,
      );
    } else if (errorAction === "continue") {
      lines.push("          // Error policy: continue");
    } else {
      lines.push("          // Error policy: abort");
    }

    lines.push("          toolResults.push({");
    lines.push('            type: "tool_result",');
    lines.push("            tool_use_id: toolUse.id,");
    lines.push(
      "            content: `Error: ${error instanceof Error ? error.message : String(error)}`,",
    );
    lines.push("            is_error: true,");
    lines.push("          });");
    lines.push("        }");
    lines.push("      }");
    lines.push(
      '      messages.push({ role: "user", content: toolResults });',
    );
    lines.push("      continue;");
    lines.push("    }");
    lines.push("");
  }

  lines.push("    // No more tool calls — return final response");
  lines.push("    return response.content;");
  lines.push("  }");
  lines.push("}");

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Permission comments
// ---------------------------------------------------------------------------

function renderPermissionComments(ir: AgentIR, lines: string[]): void {
  const perms = ir.permissions;
  const hasPerms =
    perms.network.allowedHosts.length > 0 ||
    perms.filesystem.allowedPaths.length > 0 ||
    perms.execution.allowedCommands.length > 0;

  if (!hasPerms) return;

  lines.push("// ---------------------------------------------------------------------------");
  lines.push("// Permission Guards (from ADL passport)");
  lines.push("// ---------------------------------------------------------------------------");

  if (perms.network.allowedHosts.length > 0) {
    lines.push(
      `// Network: allowed hosts = ${JSON.stringify(perms.network.allowedHosts)}`,
    );
    if (perms.network.denyPrivate) {
      lines.push("// Network: private addresses denied");
    }
  }

  if (perms.filesystem.allowedPaths.length > 0) {
    lines.push("// Filesystem:");
    for (const p of perms.filesystem.allowedPaths) {
      lines.push(`//   ${p.path} (${p.access})`);
    }
  }

  if (perms.execution.allowedCommands.length > 0) {
    lines.push(
      `// Execution: allowed commands = ${JSON.stringify(perms.execution.allowedCommands)}`,
    );
  }

  lines.push("");
}

// ---------------------------------------------------------------------------
// package.json
// ---------------------------------------------------------------------------

export function renderPackageJson(ir: AgentIR): string {
  const pkg = {
    name: ir.identity.name.toLowerCase().replace(/\s+/g, "-"),
    version: ir.identity.version,
    description: ir.identity.description,
    type: "module",
    main: "agent.ts",
    scripts: {
      start: "npx tsx agent.ts",
    },
    dependencies: {
      "@anthropic-ai/sdk": "^0.39.0",
    },
    devDependencies: {
      tsx: "^4.0.0",
      typescript: "~5.6.0",
    },
  };

  return JSON.stringify(pkg, null, 2) + "\n";
}

// ---------------------------------------------------------------------------
// tsconfig.json
// ---------------------------------------------------------------------------

export function renderTsConfig(): string {
  const config = {
    compilerOptions: {
      target: "ESNext",
      module: "ESNext",
      moduleResolution: "bundler",
      esModuleInterop: true,
      strict: true,
      skipLibCheck: true,
      outDir: "dist",
    },
    include: ["*.ts"],
  };

  return JSON.stringify(config, null, 2) + "\n";
}
