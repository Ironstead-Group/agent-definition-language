/**
 * String-based ADL document parser (IO-free).
 */

import { parse as parseYaml } from "yaml";
import type { ADLDocument } from "../types/document.js";
import { createError, type ADLError } from "../types/errors.js";

export interface ParseResult<T = ADLDocument> {
  document: T | null;
  errors: ADLError[];
}

/**
 * Parse an ADL document from a string. Auto-detects format or uses the hint.
 */
export function parseADL(
  input: string,
  format?: "json" | "yaml",
): ParseResult {
  const detected = format ?? detectFormat(input);

  if (detected === "json") {
    return parseJsonString(input);
  }
  return parseYamlString(input);
}

function detectFormat(input: string): "json" | "yaml" {
  const trimmed = input.trimStart();
  if (trimmed.startsWith("{")) return "json";
  return "yaml";
}

function parseJsonString(content: string): ParseResult {
  try {
    const data = JSON.parse(content);
    if (typeof data !== "object" || data === null || Array.isArray(data)) {
      return {
        document: null,
        errors: [createError("ADL-1002", "Document must be a JSON object")],
      };
    }
    return { document: data as ADLDocument, errors: [] };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      document: null,
      errors: [createError("ADL-1001", `Invalid JSON: ${message}`)],
    };
  }
}

function parseYamlString(content: string): ParseResult {
  try {
    const data = parseYaml(content);
    if (typeof data !== "object" || data === null || Array.isArray(data)) {
      return {
        document: null,
        errors: [createError("ADL-1002", "Document must be a YAML mapping")],
      };
    }
    return { document: data as ADLDocument, errors: [] };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      document: null,
      errors: [createError("ADL-1001", `Invalid YAML: ${message}`)],
    };
  }
}
