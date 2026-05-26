/**
 * Dynamic formatter plugin loading.
 */

import * as path from "node:path";
import { pathToFileURL } from "node:url";
import {
  defineFormatterPlugin,
  isFormatterPlugin,
  isFormatterPluginDefinition,
  registerPlugin,
} from "./plugin.js";
import type { FormatterPlugin } from "./plugin.js";

export interface LoadFormatterPluginsOptions {
  /** Base directory for relative plugin paths. Defaults to process.cwd(). */
  baseDir?: string;
  /** Register loaded plugins in the global registry. Defaults to true. */
  register?: boolean;
}

/**
 * Load formatter plugins from ESM modules.
 *
 * A module may export a plugin as `default`, `plugin`, or as entries in a
 * `plugins` array. Plain renderer definitions are wrapped with
 * `defineFormatterPlugin`.
 */
export async function loadFormatterPlugins(
  specifiers: string | string[],
  options: LoadFormatterPluginsOptions = {},
): Promise<FormatterPlugin[]> {
  const loaded: FormatterPlugin[] = [];
  const list = Array.isArray(specifiers) ? specifiers : [specifiers];

  for (const specifier of list) {
    const moduleUrl = resolvePluginSpecifier(
      specifier,
      options.baseDir ?? process.cwd(),
    );
    const moduleExports = await import(moduleUrl) as Record<string, unknown>;
    const plugins = extractFormatterPlugins(moduleExports, specifier);

    if (options.register !== false) {
      for (const plugin of plugins) registerPlugin(plugin);
    }

    loaded.push(...plugins);
  }

  return loaded;
}

function resolvePluginSpecifier(specifier: string, baseDir: string): string {
  if (
    specifier.startsWith(".") ||
    specifier.startsWith("/") ||
    specifier.endsWith(".js") ||
    specifier.endsWith(".mjs") ||
    specifier.endsWith(".ts")
  ) {
    return pathToFileURL(path.resolve(baseDir, specifier)).href;
  }

  return specifier;
}

function extractFormatterPlugins(
  moduleExports: Record<string, unknown>,
  specifier: string,
): FormatterPlugin[] {
  const candidates: unknown[] = [
    moduleExports.default,
    moduleExports.plugin,
  ];

  if (Array.isArray(moduleExports.plugins)) {
    candidates.push(...moduleExports.plugins);
  }

  for (const value of Object.values(moduleExports)) {
    if (!candidates.includes(value)) candidates.push(value);
  }

  const plugins = candidates.flatMap((candidate) => {
    if (isFormatterPlugin(candidate)) return [candidate];
    if (isFormatterPluginDefinition(candidate)) {
      return [defineFormatterPlugin(candidate)];
    }
    return [];
  });

  const unique = new Map<string, FormatterPlugin>();
  for (const plugin of plugins) unique.set(plugin.id, plugin);

  if (unique.size === 0) {
    throw new Error(
      `Module "${specifier}" did not export a formatter plugin or renderer definition`,
    );
  }

  return Array.from(unique.values());
}
