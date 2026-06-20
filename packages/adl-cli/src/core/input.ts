/**
 * Input loading for CLI commands.
 *
 * Supports reading an ADL document from a file path or, when the path is "-",
 * from stdin so commands compose in pipelines:
 *   cat agent.adl.json | adl validate -
 */

import * as fs from "node:fs";
import { parseADL } from "@adl-spec/core";
import { loadDocument, type LoadResult } from "./loader.js";

export const STDIN_ARG = "-";

export interface InputResult extends LoadResult {
  /** Human-readable label for the source, e.g. a path or "<stdin>". */
  source: string;
}

/** Read all of stdin synchronously (fd 0). */
export function readStdin(): string {
  return fs.readFileSync(0, "utf-8");
}

/**
 * Load an ADL document from a file path, or from stdin when the arg is "-".
 * Parsing from stdin auto-detects JSON vs YAML.
 */
export function loadInput(fileArg: string): InputResult {
  if (fileArg === STDIN_ARG) {
    const { document, errors } = parseADL(readStdin());
    return { data: document, errors, source: "<stdin>" };
  }
  const { data, errors } = loadDocument(fileArg);
  return { data, errors, source: fileArg };
}
