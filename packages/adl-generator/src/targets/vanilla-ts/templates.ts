/**
 * Code templates for the vanilla (framework-agnostic) TypeScript target.
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
// agent.ts
// ---------------------------------------------------------------------------

export function renderAgent(ir: AgentIR): string {
  const lines: string[] = [];

  lines.push("/**");
  lines.push(` * ${ir.identity.name} — Framework-agnostic agent`);
  lines.push(` * ${ir.identity.description}`);
  lines.push(` * Version: ${ir.identity.version}`);
  lines.push(" */");
  lines.push("");

  // Import param types
  const paramTypeImports = ir.tools
    .filter((t) => t.parameters)
    .map((t) => `${pascalCase(t.name)}Params`);
  const returnTypeImports = ir.tools
    .filter((t) => t.returns)
    .map((t) => `${pascalCase(t.name)}Result`);
  const allImports = [...paramTypeImports, ...returnTypeImports];

  if (allImports.length > 0) {
    lines.push(`import type { ${allImports.join(", ")} } from "./types.js";`);
    lines.push("");
  }

  // System prompt constant
  if (ir.systemPrompt) {
    lines.push(
      `export const SYSTEM_PROMPT = \`${escapeStr(ir.systemPrompt)}\`;`,
    );
    lines.push("");
  }

  // Permission documentation
  renderPermissionDocs(ir, lines);

  // Agent class
  lines.push(`export class ${pascalCase(ir.identity.name)}Agent {`);
  lines.push(`  readonly name = "${ir.identity.name}";`);
  lines.push(
    `  readonly description = "${ir.identity.description.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}";`,
  );
  lines.push(`  readonly version = "${ir.identity.version}";`);

  if (ir.systemPrompt) {
    lines.push(`  readonly systemPrompt = SYSTEM_PROMPT;`);
  }

  lines.push("");

  // Tool methods
  for (const tool of ir.tools) {
    const methodName = camelCase(tool.name);
    const paramType = tool.parameters
      ? `${pascalCase(tool.name)}Params`
      : undefined;
    const returnType = tool.returns
      ? `${pascalCase(tool.name)}Result`
      : "unknown";

    lines.push(`  /**`);
    lines.push(`   * ${tool.description}`);
    if (tool.readOnly) lines.push(`   * @readonly`);
    if (tool.idempotent) lines.push(`   * @idempotent`);
    if (tool.requiresConfirmation)
      lines.push(`   * @requiresConfirmation`);
    lines.push(`   */`);

    const paramSig = paramType ? `params: ${paramType}` : "";
    lines.push(
      `  async ${methodName}(${paramSig}): Promise<${returnType}> {`,
    );
    lines.push(
      `    // TODO: Implement ${tool.name}`,
    );
    lines.push(`    throw new Error("Not implemented: ${tool.name}");`);
    lines.push(`  }`);
    lines.push("");
  }

  // listTools helper
  lines.push("  /** List available tools and their metadata. */");
  lines.push(
    "  listTools(): Array<{ name: string; description: string; readOnly: boolean; idempotent: boolean }> {",
  );
  lines.push("    return [");
  for (const tool of ir.tools) {
    lines.push("      {");
    lines.push(`        name: "${tool.name}",`);
    lines.push(
      `        description: "${tool.description.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}",`,
    );
    lines.push(`        readOnly: ${tool.readOnly},`);
    lines.push(`        idempotent: ${tool.idempotent},`);
    lines.push("      },");
  }
  lines.push("    ];");
  lines.push("  }");

  lines.push("}");

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Permission documentation
// ---------------------------------------------------------------------------

function renderPermissionDocs(ir: AgentIR, lines: string[]): void {
  const perms = ir.permissions;
  const hasPerms =
    perms.network.allowedHosts.length > 0 ||
    perms.filesystem.allowedPaths.length > 0 ||
    perms.execution.allowedCommands.length > 0;

  if (!hasPerms) return;

  lines.push("/**");
  lines.push(" * Permission constraints (from ADL passport):");

  if (perms.network.allowedHosts.length > 0) {
    lines.push(
      ` * - Network: allowed hosts = ${JSON.stringify(perms.network.allowedHosts)}`,
    );
    if (perms.network.denyPrivate) {
      lines.push(" * - Network: private addresses denied");
    }
  }

  if (perms.filesystem.allowedPaths.length > 0) {
    lines.push(" * - Filesystem:");
    for (const p of perms.filesystem.allowedPaths) {
      lines.push(` *   - ${p.path} (${p.access})`);
    }
  }

  if (perms.execution.allowedCommands.length > 0) {
    lines.push(
      ` * - Execution: allowed commands = ${JSON.stringify(perms.execution.allowedCommands)}`,
    );
  }

  lines.push(" */");
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
    devDependencies: {
      tsx: "^4.0.0",
      typescript: "~5.6.0",
    },
  };

  return JSON.stringify(pkg, null, 2) + "\n";
}
