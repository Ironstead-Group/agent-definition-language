/**
 * adl.config.json — declarative generation config.
 *
 * Lets a project declare what to generate from which ADL document(s) and
 * where, so `adl generate` runs with no flags as a build step. Generated
 * output is meant to be a build artifact (gitignored), regenerated on every
 * build so the spec stays the single source of truth.
 */

import * as fs from "node:fs";
import * as path from "node:path";

export const DEFAULT_CONFIG_FILE = "adl.config.json";

export interface GenerateEntry {
  /** Path to the ADL document to generate from. */
  source: string;
  /** Registered target id (built-in or plugin-provided). */
  target: string;
  /** Output directory for this entry's generated files. */
  output: string;
  /** Wipe the output directory before writing (removes stale files). */
  clean?: boolean;
}

export interface AdlConfig {
  /** External formatter-plugin modules to load before generating. */
  plugins?: string[];
  /** One entry per (source, target, output) to generate. */
  generate: GenerateEntry[];
}

export interface LoadedConfig {
  config: AdlConfig;
  /** Absolute path the config was loaded from. */
  path: string;
}

/** Resolve the config path: explicit override, else adl.config.json in cwd. */
export function findConfig(explicit?: string): string | null {
  if (explicit) return path.resolve(explicit);
  const candidate = path.resolve(process.cwd(), DEFAULT_CONFIG_FILE);
  return fs.existsSync(candidate) ? candidate : null;
}

/** Load and validate the config. Throws Error with an actionable message. */
export function loadConfig(explicit?: string): LoadedConfig {
  const configPath = findConfig(explicit);
  if (!configPath) {
    throw new Error(
      `No ${DEFAULT_CONFIG_FILE} found in the current directory.\n` +
        `  Create one, or generate explicitly: adl generate <file> --target <id>`,
    );
  }
  if (!fs.existsSync(configPath)) {
    throw new Error(`Config file not found: ${configPath}`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to parse ${configPath}: ${msg}`);
  }

  return { config: validateConfig(parsed, configPath), path: configPath };
}

function validateConfig(value: unknown, configPath: string): AdlConfig {
  const fail = (msg: string): never => {
    throw new Error(`Invalid ${configPath}: ${msg}`);
  };

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail("expected a JSON object");
  }
  const obj = value as Record<string, unknown>;

  if (obj.plugins !== undefined) {
    if (
      !Array.isArray(obj.plugins) ||
      !obj.plugins.every((p) => typeof p === "string")
    ) {
      fail('"plugins" must be an array of module specifiers');
    }
  }

  if (!Array.isArray(obj.generate) || obj.generate.length === 0) {
    fail('"generate" must be a non-empty array of { source, target, output }');
  }

  const entries = (obj.generate as unknown[]).map((raw, i) => {
    if (!raw || typeof raw !== "object") {
      fail(`generate[${i}] must be an object`);
    }
    const e = raw as Record<string, unknown>;
    for (const key of ["source", "target", "output"] as const) {
      if (typeof e[key] !== "string" || (e[key] as string).length === 0) {
        fail(`generate[${i}].${key} is required and must be a non-empty string`);
      }
    }
    if (e.clean !== undefined && typeof e.clean !== "boolean") {
      fail(`generate[${i}].clean must be a boolean`);
    }
    return {
      source: e.source as string,
      target: e.target as string,
      output: e.output as string,
      clean: e.clean as boolean | undefined,
    };
  });

  return {
    plugins: obj.plugins as string[] | undefined,
    generate: entries,
  };
}

/**
 * Guard against cleaning a dangerous path. The output must be a subdirectory
 * of the current working directory (not cwd itself or a filesystem root).
 */
export function assertSafeCleanTarget(output: string): void {
  const abs = path.resolve(output);
  const cwd = process.cwd();
  if (abs === cwd || abs === path.parse(abs).root || !abs.startsWith(cwd + path.sep)) {
    throw new Error(
      `Refusing to clean "${output}": must be a subdirectory of the current directory.`,
    );
  }
}
