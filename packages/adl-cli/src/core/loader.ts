import * as fs from "node:fs";
import * as path from "node:path";
import { parse as parseYaml } from "yaml";
import { createError, type ADLError } from "./errors.js";

export interface LoadResult {
  data: unknown;
  errors: ADLError[];
}

/**
 * Load and parse an ADL document from a file path.
 * Detects format by extension: .json, .yaml, .yml
 */
export function loadDocument(filePath: string): LoadResult {
  const ext = path.extname(filePath).toLowerCase();
  const absolutePath = path.resolve(filePath);

  if (!fs.existsSync(absolutePath)) {
    return {
      data: null,
      errors: [
        createError("ADL-1001", `File not found: ${filePath}`),
      ],
    };
  }

  const content = fs.readFileSync(absolutePath, "utf-8");

  if (ext === ".yaml" || ext === ".yml") {
    return parseYamlDocument(content);
  }

  return parseJsonDocument(content);
}

function parseJsonDocument(content: string): LoadResult {
  try {
    const data = JSON.parse(content);
    if (typeof data !== "object" || data === null || Array.isArray(data)) {
      return {
        data: null,
        errors: [
          createError("ADL-1002", "Document must be a JSON object"),
        ],
      };
    }
    return { data, errors: [] };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      data: null,
      errors: [
        createError("ADL-1001", `Invalid JSON: ${message}`),
      ],
    };
  }
}

function parseYamlDocument(content: string): LoadResult {
  try {
    const data = parseYaml(content);
    if (typeof data !== "object" || data === null || Array.isArray(data)) {
      return {
        data: null,
        errors: [
          createError("ADL-1002", "Document must be a YAML mapping"),
        ],
      };
    }
    return { data, errors: [] };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      data: null,
      errors: [
        createError("ADL-1001", `Invalid YAML: ${message}`),
      ],
    };
  }
}
