/**
 * File-based ADL document loader.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import type { ADLDocument } from "../types/document.js";
import { createError } from "../types/errors.js";
import { parseADL, type ParseResult } from "./parser.js";

/**
 * Load and parse an ADL document from a file path.
 * Detects format by extension: .json, .yaml, .yml
 */
export async function loadADL(filePath: string): Promise<ParseResult> {
  const ext = path.extname(filePath).toLowerCase();
  const absolutePath = path.resolve(filePath);

  if (!fs.existsSync(absolutePath)) {
    return {
      document: null,
      errors: [createError("ADL-1001", `File not found: ${filePath}`)],
    };
  }

  const content = fs.readFileSync(absolutePath, "utf-8");
  const format =
    ext === ".yaml" || ext === ".yml" ? ("yaml" as const) : ("json" as const);

  return parseADL(content, format);
}

/**
 * Synchronous variant for backward compatibility.
 */
export function loadADLSync(filePath: string): ParseResult {
  const ext = path.extname(filePath).toLowerCase();
  const absolutePath = path.resolve(filePath);

  if (!fs.existsSync(absolutePath)) {
    return {
      document: null,
      errors: [createError("ADL-1001", `File not found: ${filePath}`)],
    };
  }

  const content = fs.readFileSync(absolutePath, "utf-8");
  const format =
    ext === ".yaml" || ext === ".yml" ? ("yaml" as const) : ("json" as const);

  return parseADL(content, format);
}
