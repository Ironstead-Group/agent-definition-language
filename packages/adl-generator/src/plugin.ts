/**
 * Formatter plugin API and registry.
 *
 * A formatter plugin is an executable code-generation target. It can be used
 * through the shared generator registry or imported and executed directly.
 */

import type { ADLDocument } from "@adl-spec/core";
import { transformToIR } from "./ir/transform.js";
import type { AgentIR } from "./ir/types.js";
import type { GeneratedFile, TargetRenderer } from "./renderer.js";

export interface GenerateResult {
  /** Target/plugin id that produced the files. */
  target: string;
  /** Formatter plugin id that produced the files. */
  plugin: string;
  files: GeneratedFile[];
}

export interface FormatterRenderContext {
  document?: ADLDocument;
  plugin: FormatterPlugin;
}

export interface FormatterExecuteOptions {
  /**
   * Precomputed IR. Useful for callers that need to inspect or customize the
   * ADL -> IR step before executing a formatter.
   */
  ir?: AgentIR;
}

export interface FormatterPlugin extends TargetRenderer {
  readonly kind: "formatter";
  execute(
    doc: ADLDocument,
    options?: FormatterExecuteOptions,
  ): GenerateResult;
}

export type FormatterPluginDefinition = Omit<FormatterPlugin, "kind" | "execute">;

/**
 * Wrap a renderer definition as an executable formatter plugin.
 */
export function defineFormatterPlugin(
  definition: FormatterPluginDefinition,
): FormatterPlugin {
  const plugin: FormatterPlugin = {
    kind: "formatter",
    id: definition.id,
    label: definition.label,
    outputLanguage: definition.outputLanguage,
    render(ir: AgentIR, context?: FormatterRenderContext): GeneratedFile[] {
      return definition.render(ir, context);
    },
    execute(
      doc: ADLDocument,
      options: FormatterExecuteOptions = {},
    ): GenerateResult {
      const ir = options.ir ?? transformToIR(doc);
      return {
        target: definition.id,
        plugin: definition.id,
        files: plugin.render(ir, { document: doc, plugin }),
      };
    },
  };

  return plugin;
}

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

const plugins = new Map<string, FormatterPlugin>();

/** Register a formatter plugin in the global registry. */
export function registerPlugin(plugin: FormatterPlugin): void {
  plugins.set(plugin.id, plugin);
}

/** Look up a formatter plugin by id. */
export function getPlugin(id: string): FormatterPlugin | undefined {
  return plugins.get(id);
}

/** Return all registered formatter plugins. */
export function listPlugins(): FormatterPlugin[] {
  return Array.from(plugins.values());
}

/** Execute a registered formatter plugin by id. */
export function executePlugin(
  doc: ADLDocument,
  pluginId: string,
  options?: FormatterExecuteOptions,
): GenerateResult {
  const plugin = getPlugin(pluginId);
  if (!plugin) {
    const known = listPlugins();
    throw new Error(
      `Unknown formatter plugin "${pluginId}". Available plugins: ${known.map((p) => p.id).join(", ") || "(none)"}`,
    );
  }

  return plugin.execute(doc, options);
}

export function isFormatterPlugin(value: unknown): value is FormatterPlugin {
  return (
    !!value &&
    typeof value === "object" &&
    (value as FormatterPlugin).kind === "formatter" &&
    typeof (value as FormatterPlugin).id === "string" &&
    typeof (value as FormatterPlugin).label === "string" &&
    typeof (value as FormatterPlugin).outputLanguage === "string" &&
    typeof (value as FormatterPlugin).render === "function" &&
    typeof (value as FormatterPlugin).execute === "function"
  );
}

export function isFormatterPluginDefinition(
  value: unknown,
): value is FormatterPluginDefinition {
  return (
    !!value &&
    typeof value === "object" &&
    typeof (value as FormatterPluginDefinition).id === "string" &&
    typeof (value as FormatterPluginDefinition).label === "string" &&
    typeof (value as FormatterPluginDefinition).outputLanguage === "string" &&
    typeof (value as FormatterPluginDefinition).render === "function"
  );
}
