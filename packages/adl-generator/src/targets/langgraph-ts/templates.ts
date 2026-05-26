/**
 * Code templates for the LangGraph TypeScript target.
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
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join("");
}

function camelCase(name: string): string {
  const pascal = pascalCase(name);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

function safeIdentifier(name: string): string {
  const candidate = camelCase(name).replace(/[^A-Za-z0-9_$]/g, "");
  return candidate || "value";
}

function escapeStr(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$/g, "\\$");
}

function quote(s: string): string {
  return JSON.stringify(s);
}

function objectEntries(
  value: unknown,
): Array<[string, Record<string, unknown>]> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  return Object.entries(value as Record<string, unknown>).filter(
    (entry): entry is [string, Record<string, unknown>] =>
      !!entry[1] && typeof entry[1] === "object" && !Array.isArray(entry[1]),
  );
}

function schemaType(schema: Record<string, unknown>): string | undefined {
  const type = schema.type;
  if (Array.isArray(type)) {
    return type.find((item) => typeof item === "string" && item !== "null");
  }
  return typeof type === "string" ? type : undefined;
}

function renderStringEnum(values: unknown[]): string | null {
  const strings = values.filter((value): value is string => typeof value === "string");
  if (strings.length !== values.length || strings.length === 0) return null;
  return `z.enum(${JSON.stringify(strings)} as [string, ...string[]])`;
}

function renderZodSchema(schema: Record<string, unknown> | null): string {
  if (!schema) return "z.object({})";

  if (Array.isArray(schema.enum)) {
    const enumSchema = renderStringEnum(schema.enum);
    if (enumSchema) return withDescription(enumSchema, schema);
  }

  const type = schemaType(schema);
  let rendered: string;

  switch (type) {
    case "string":
      rendered = "z.string()";
      break;
    case "number":
      rendered = "z.number()";
      break;
    case "integer":
      rendered = "z.number().int()";
      break;
    case "boolean":
      rendered = "z.boolean()";
      break;
    case "array": {
      const items =
        schema.items && typeof schema.items === "object" && !Array.isArray(schema.items)
          ? (schema.items as Record<string, unknown>)
          : null;
      rendered = `z.array(${renderZodSchema(items)})`;
      break;
    }
    case "object":
    default: {
      const properties = objectEntries(schema.properties);
      if (properties.length === 0) {
        rendered = "z.object({})";
        break;
      }

      const required = new Set(
        Array.isArray(schema.required)
          ? schema.required.filter((item): item is string => typeof item === "string")
          : [],
      );
      const fields = properties.map(([key, value]) => {
        const field = required.has(key)
          ? renderZodSchema(value)
          : `${renderZodSchema(value)}.optional()`;
        return `  ${quote(key)}: ${field}`;
      });
      rendered = `z.object({\n${fields.join(",\n")}\n})`;
      break;
    }
  }

  return withDescription(rendered, schema);
}

function withDescription(
  rendered: string,
  schema: Record<string, unknown>,
): string {
  return typeof schema.description === "string"
    ? `${rendered}.describe(${quote(schema.description)})`
    : rendered;
}

function modelId(ir: AgentIR): string {
  const provider = ir.model?.provider;
  const name = ir.model?.name;
  if (provider && name && !name.includes(":")) return `${provider}:${name}`;
  if (name) return name;
  return "openai:gpt-4o-mini";
}

function providerDependency(ir: AgentIR): Record<string, string> {
  const provider = ir.model?.provider ?? modelId(ir).split(":")[0];
  switch (provider) {
    case "anthropic":
      return { "@langchain/anthropic": "^1.0.0" };
    case "google":
    case "google_genai":
    case "google-genai":
      return { "@langchain/google-genai": "^1.0.0" };
    case "openai":
    default:
      return { "@langchain/openai": "^1.0.0" };
  }
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
    ` * LangGraph tool definitions for ${ir.identity.name}`,
    " */",
    "",
    'import { tool } from "@langchain/core/tools";',
    'import * as z from "zod";',
  ];

  const typeImports = toolTypeImports(ir.tools);
  if (typeImports.length > 0) {
    lines.push(`import type { ${typeImports.join(", ")} } from "./types.js";`);
  }

  lines.push("");

  for (const toolDef of ir.tools) {
    renderToolImplementation(toolDef, lines);
  }

  if (ir.tools.length === 0) {
    lines.push("export const tools = [];");
    lines.push("export const toolsByName = {};");
  } else {
    lines.push("export const tools = [");
    for (const toolDef of ir.tools) {
      lines.push(`  ${safeIdentifier(toolDef.name)}Tool,`);
    }
    lines.push("];");
    lines.push("");
    lines.push("export const toolsByName = {");
    for (const toolDef of ir.tools) {
      lines.push(`  ${quote(toolDef.name)}: ${safeIdentifier(toolDef.name)}Tool,`);
    }
    lines.push("};");
  }

  lines.push("");
  lines.push("export const ADL_TOOL_POLICIES = {");
  for (const toolDef of ir.tools) {
    lines.push(`  ${quote(toolDef.name)}: {`);
    lines.push(`    readOnly: ${toolDef.readOnly},`);
    lines.push(`    idempotent: ${toolDef.idempotent},`);
    lines.push(`    requiresConfirmation: ${toolDef.requiresConfirmation},`);
    lines.push("  },");
  }
  lines.push("} as const;");

  return lines.join("\n");
}

function toolTypeImports(tools: ToolIR[]): string[] {
  const imports: string[] = [];
  for (const toolDef of tools) {
    if (toolDef.parameters) imports.push(`${pascalCase(toolDef.name)}Params`);
    if (toolDef.returns) imports.push(`${pascalCase(toolDef.name)}Result`);
  }
  return imports;
}

function renderToolImplementation(toolDef: ToolIR, lines: string[]): void {
  const baseName = safeIdentifier(toolDef.name);
  const paramsType = toolDef.parameters
    ? `${pascalCase(toolDef.name)}Params`
    : "Record<string, never>";
  const resultType = toolDef.returns
    ? `${pascalCase(toolDef.name)}Result`
    : "unknown";
  const schema = renderZodSchema(toolDef.parameters);

  lines.push("/**");
  lines.push(` * ${toolDef.description}`);
  if (toolDef.readOnly) lines.push(" * @readonly");
  if (toolDef.idempotent) lines.push(" * @idempotent");
  if (toolDef.requiresConfirmation) lines.push(" * @requiresConfirmation");
  lines.push(" */");
  lines.push(
    `export async function ${baseName}Impl(input: ${paramsType}): Promise<${resultType}> {`,
  );
  lines.push("  void input;");
  lines.push(`  throw new Error(${quote(`Not implemented: ${toolDef.name}`)});`);
  lines.push("}");
  lines.push("");
  lines.push(`export const ${baseName}Tool = tool(${baseName}Impl, {`);
  lines.push(`  name: ${quote(toolDef.name)},`);
  lines.push(`  description: ${quote(toolDef.description)},`);
  lines.push(`  schema: ${indent(schema, 2)},`);
  lines.push("});");
  lines.push("");
}

function indent(value: string, spaces: number): string {
  const padding = " ".repeat(spaces);
  return value.replace(/\n/g, `\n${padding}`);
}

// ---------------------------------------------------------------------------
// agent.ts
// ---------------------------------------------------------------------------

export function renderAgent(ir: AgentIR): string {
  const lines: string[] = [];

  lines.push("/**");
  lines.push(` * ${ir.identity.name} - LangGraph agent`);
  lines.push(` * ${ir.identity.description}`);
  lines.push(` * Version: ${ir.identity.version}`);
  lines.push(" */");
  lines.push("");
  lines.push('import { initChatModel } from "langchain/chat_models/universal";');
  lines.push('import { AIMessage, HumanMessage, SystemMessage, ToolMessage } from "@langchain/core/messages";');
  lines.push('import type { ToolCall } from "@langchain/core/messages/tool";');
  lines.push("import {");
  lines.push("  END,");
  lines.push("  MessagesValue,");
  lines.push("  ReducedValue,");
  lines.push("  START,");
  lines.push("  StateGraph,");
  lines.push("  StateSchema,");
  lines.push("} from \"@langchain/langgraph\";");
  lines.push('import type { ConditionalEdgeRouter, GraphNode } from "@langchain/langgraph";');
  lines.push('import * as z from "zod";');
  lines.push('import { ADL_TOOL_POLICIES, tools, toolsByName } from "./tools.js";');
  lines.push("");
  lines.push(`export const AGENT_NAME = ${quote(ir.identity.name)};`);
  lines.push(`export const AGENT_VERSION = ${quote(ir.identity.version)};`);
  if (ir.identity.id) {
    lines.push(`export const AGENT_ID = ${quote(ir.identity.id)};`);
  }
  lines.push(`export const DEFAULT_MODEL = ${quote(modelId(ir))};`);
  if (ir.systemPrompt) {
    lines.push(`export const SYSTEM_PROMPT = \`${escapeStr(ir.systemPrompt)}\`;`);
  } else {
    lines.push(
      `export const SYSTEM_PROMPT = ${quote(`${ir.identity.name}: ${ir.identity.description}`)};`,
    );
  }
  lines.push("");
  renderPolicyConstants(ir, lines);
  lines.push("");
  lines.push("const MessagesState = new StateSchema({");
  lines.push("  messages: MessagesValue,");
  lines.push("  llmCalls: new ReducedValue(z.number().default(0), {");
  lines.push("    reducer: (left, right) => left + right,");
  lines.push("  }),");
  lines.push("});");
  lines.push("");
  lines.push("export interface AgentRuntimeOptions {");
  lines.push("  model?: string;");
  lines.push("  confirmTool?: (toolCall: ToolCall) => Promise<boolean> | boolean;");
  lines.push("}");
  lines.push("");
  lines.push("export async function createAgent(options: AgentRuntimeOptions = {}) {");
  lines.push("  assertLifecycleAllowsExecution();");
  lines.push("");
  lines.push("  const model = await initChatModel(options.model ?? process.env.ADL_MODEL ?? DEFAULT_MODEL, {");
  if (ir.model?.temperature !== undefined) {
    lines.push(`    temperature: ${ir.model.temperature},`);
  }
  if (ir.model?.maxTokens !== undefined) {
    lines.push(`    maxTokens: ${ir.model.maxTokens},`);
  }
  lines.push("  });");
  lines.push("  const modelWithTools = model.bindTools(tools);");
  lines.push("");
  lines.push("  const llmCall: GraphNode<typeof MessagesState> = async (state) => {");
  lines.push("    const response = await modelWithTools.invoke([");
  lines.push("      new SystemMessage(SYSTEM_PROMPT),");
  lines.push("      ...state.messages,");
  lines.push("    ]);");
  lines.push("");
  lines.push("    return {");
  lines.push("      messages: [response],");
  lines.push("      llmCalls: 1,");
  lines.push("    };");
  lines.push("  };");
  lines.push("");
  lines.push("  const toolNode: GraphNode<typeof MessagesState> = async (state) => {");
  lines.push("    const lastMessage = state.messages.at(-1);");
  lines.push("    if (lastMessage == null || !AIMessage.isInstance(lastMessage)) {");
  lines.push("      return { messages: [] };");
  lines.push("    }");
  lines.push("");
  lines.push("    const toolCalls = lastMessage.tool_calls ?? [];");
  lines.push("    const results = TOOL_INVOCATION_PARALLEL");
  lines.push("      ? await invokeToolCallsWithLimit(toolCalls, options)");
  lines.push("      : await invokeToolCallsSerially(toolCalls, options);");
  lines.push("");
  lines.push("    return { messages: results };");
  lines.push("  };");
  lines.push("");
  lines.push("  const shouldContinue: ConditionalEdgeRouter<typeof MessagesState, \"toolNode\"> = (state) => {");
  lines.push("    const lastMessage = state.messages.at(-1);");
  lines.push("    if (!lastMessage || !AIMessage.isInstance(lastMessage)) return END;");
  lines.push("    return lastMessage.tool_calls?.length ? \"toolNode\" : END;");
  lines.push("  };");
  lines.push("");
  lines.push("  return new StateGraph(MessagesState)");
  lines.push("    .addNode(\"llmCall\", llmCall)");
  lines.push("    .addNode(\"toolNode\", toolNode)");
  lines.push("    .addEdge(START, \"llmCall\")");
  lines.push("    .addConditionalEdges(\"llmCall\", shouldContinue, [\"toolNode\", END])");
  lines.push("    .addEdge(\"toolNode\", \"llmCall\")");
  lines.push("    .compile();");
  lines.push("}");
  lines.push("");
  lines.push("async function invokeToolCallsSerially(");
  lines.push("  toolCalls: ToolCall[],");
  lines.push("  options: AgentRuntimeOptions,");
  lines.push("): Promise<ToolMessage[]> {");
  lines.push("  const results: ToolMessage[] = [];");
  lines.push("  for (const toolCall of toolCalls) {");
  lines.push("    results.push(await invokeToolCall(toolCall, options));");
  lines.push("  }");
  lines.push("  return results;");
  lines.push("}");
  lines.push("");
  lines.push("async function invokeToolCallsWithLimit(");
  lines.push("  toolCalls: ToolCall[],");
  lines.push("  options: AgentRuntimeOptions,");
  lines.push("): Promise<ToolMessage[]> {");
  lines.push("  const limit = Math.max(1, TOOL_MAX_CONCURRENT ?? toolCalls.length || 1);");
  lines.push("  const results: ToolMessage[] = [];");
  lines.push("  for (let index = 0; index < toolCalls.length; index += limit) {");
  lines.push("    const batch = toolCalls.slice(index, index + limit);");
  lines.push("    results.push(...await Promise.all(");
  lines.push("      batch.map((toolCall) => invokeToolCall(toolCall, options)),");
  lines.push("    ));");
  lines.push("  }");
  lines.push("  return results;");
  lines.push("}");
  lines.push("");
  lines.push("async function invokeToolCall(");
  lines.push("  toolCall: ToolCall,");
  lines.push("  options: AgentRuntimeOptions,");
  lines.push("): Promise<ToolMessage> {");
  lines.push("  const policy = ADL_TOOL_POLICIES[toolCall.name as keyof typeof ADL_TOOL_POLICIES];");
  lines.push("  const runnableTool = toolsByName[toolCall.name as keyof typeof toolsByName];");
  lines.push("");
  lines.push("  if (!runnableTool || !policy) {");
  lines.push("    return toolErrorMessage(toolCall, `Unknown tool: ${toolCall.name}`);");
  lines.push("  }");
  lines.push("");
  lines.push("  if (policy.requiresConfirmation) {");
  lines.push("    const confirmed = await options.confirmTool?.(toolCall);");
  lines.push("    if (!confirmed) {");
  lines.push("      return toolErrorMessage(");
  lines.push("        toolCall,");
  lines.push("        `Tool ${toolCall.name} requires explicit confirmation under the ADL policy.`,");
  lines.push("      );");
  lines.push("    }");
  lines.push("  }");
  lines.push("");
  lines.push("  let attempt = 0;");
  lines.push("  while (true) {");
  lines.push("    try {");
  lines.push("      const result = runnableTool.invoke(toolCall);");
  lines.push("      return await withOptionalTimeout(result, TOOL_TIMEOUT_MS);");
  lines.push("    } catch (error) {");
  lines.push("      if (TOOL_ERROR_ACTION === \"retry\" && attempt < TOOL_ERROR_MAX_RETRIES) {");
  lines.push("        attempt += 1;");
  lines.push("        continue;");
  lines.push("      }");
  lines.push("");
  lines.push("      const message = error instanceof Error ? error.message : String(error);");
  lines.push("      if (TOOL_ERROR_ACTION === \"continue\") {");
  lines.push("        return toolErrorMessage(toolCall, message);");
  lines.push("      }");
  lines.push("      throw error;");
  lines.push("    }");
  lines.push("  }");
  lines.push("}");
  lines.push("");
  lines.push("async function withOptionalTimeout<T>(");
  lines.push("  promise: Promise<T>,");
  lines.push("  timeoutMs: number | null,");
  lines.push("): Promise<T> {");
  lines.push("  if (timeoutMs === null) return promise;");
  lines.push("  let timeout: ReturnType<typeof setTimeout> | undefined;");
  lines.push("  try {");
  lines.push("    return await Promise.race([");
  lines.push("      promise,");
  lines.push("      new Promise<never>((_, reject) => {");
  lines.push("        timeout = setTimeout(");
  lines.push("          () => reject(new Error(`Tool invocation timed out after ${timeoutMs}ms`)),");
  lines.push("          timeoutMs,");
  lines.push("        );");
  lines.push("      }),");
  lines.push("    ]);");
  lines.push("  } finally {");
  lines.push("    if (timeout) clearTimeout(timeout);");
  lines.push("  }");
  lines.push("}");
  lines.push("");
  lines.push("function toolErrorMessage(toolCall: ToolCall, content: string): ToolMessage {");
  lines.push("  return new ToolMessage({");
  lines.push("    content,");
  lines.push("    name: toolCall.name,");
  lines.push("    tool_call_id: toolCall.id ?? `${toolCall.name}-unknown-call`,");
  lines.push("    additional_kwargs: { is_error: true },");
  lines.push("  });");
  lines.push("}");
  lines.push("");
  lines.push("function assertLifecycleAllowsExecution(): void {");
  if (ir.lifecycle?.status === "retired") {
    lines.push("  throw new Error(\"ADL lifecycle policy forbids executing retired agents.\");");
  } else if (ir.lifecycle?.status) {
    lines.push(`  const lifecycleStatus = ${quote(ir.lifecycle.status)};`);
    lines.push("  if (lifecycleStatus === \"retired\") {");
    lines.push("    throw new Error(\"ADL lifecycle policy forbids executing retired agents.\");");
    lines.push("  }");
  } else {
    lines.push("  // No lifecycle assertion was present in the ADL document.");
  }
  lines.push("}");
  lines.push("");
  lines.push("export async function runAgent(userMessage: string, options?: AgentRuntimeOptions) {");
  lines.push("  const agent = await createAgent(options);");
  lines.push("  return agent.invoke({");
  lines.push("    messages: [new HumanMessage(userMessage)],");
  lines.push("  });");
  lines.push("}");
  lines.push("");
  lines.push("if (import.meta.url === `file://${process.argv[1]}`) {");
  lines.push("  const userMessage = process.argv.slice(2).join(\" \") || \"Hello\";");
  lines.push("  const result = await runAgent(userMessage);");
  lines.push("  const lastMessage = result.messages.at(-1);");
  lines.push("  console.log(lastMessage?.text ?? JSON.stringify(result, null, 2));");
  lines.push("}");

  return lines.join("\n");
}

function renderPolicyConstants(ir: AgentIR, lines: string[]): void {
  lines.push("// ADL runtime policy surfaced for the LangGraph runtime.");
  lines.push(`const TOOL_INVOCATION_PARALLEL = ${ir.runtime.toolInvocation.parallel};`);
  lines.push(`const TOOL_ERROR_ACTION = ${quote(ir.runtime.errorHandling.onToolError)};`);
  lines.push(`const TOOL_ERROR_MAX_RETRIES = ${ir.runtime.errorHandling.maxRetries};`);
  lines.push(
    `const TOOL_MAX_CONCURRENT: number | null = ${ir.runtime.toolInvocation.maxConcurrent ?? "null"};`,
  );
  lines.push(
    `const TOOL_TIMEOUT_MS: number | null = ${ir.runtime.toolInvocation.timeoutMs ?? "null"};`,
  );
  lines.push(`const DATA_SENSITIVITY = ${quote(ir.dataClassification.sensitivity)};`);
  if (ir.permissions.network.allowedHosts.length > 0) {
    lines.push(
      `const ALLOWED_NETWORK_HOSTS = ${JSON.stringify(ir.permissions.network.allowedHosts)};`,
    );
    lines.push("void ALLOWED_NETWORK_HOSTS;");
  }
  lines.push("void DATA_SENSITIVITY;");
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
      start: "tsx agent.ts",
      typecheck: "tsc --noEmit",
    },
    dependencies: {
      "@langchain/core": "^1.0.0",
      "@langchain/langgraph": "^1.0.0",
      langchain: "^1.3.0",
      zod: "^4.1.0",
      ...providerDependency(ir),
    },
    devDependencies: {
      "@types/node": "^22.13.4",
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

// ---------------------------------------------------------------------------
// README.md
// ---------------------------------------------------------------------------

export function renderReadme(ir: AgentIR): string {
  const title = `# ${ir.identity.name} - LangGraph`;
  const lines = [
    title,
    "",
    ir.identity.description,
    "",
    "## Generated Shape",
    "",
    "- `agent.ts` builds a LangGraph `StateGraph` with an LLM node, a tool node, and a conditional edge.",
    "- `tools.ts` maps ADL tool declarations to LangChain tool definitions with Zod schemas and TODO implementation bodies.",
    "- `types.ts` contains TypeScript types generated from ADL JSON Schema tool parameters and return schemas.",
    "- ADL lifecycle, runtime tool behavior, data classification, and permission declarations are surfaced as execution policy hooks.",
    "",
    "## Run",
    "",
    "```bash",
    "npm install",
    "export ADL_MODEL=\"" + modelId(ir) + "\"",
    "npm run start -- \"Hello\"",
    "```",
    "",
    "Import `createAgent()` or `runAgent()` from `agent.ts` in an application entry point after implementing the tool bodies in `tools.ts`.",
    "",
  ];

  return lines.join("\n");
}
