/**
 * Tool: show_example — return example ADL documents from the repo.
 */

import * as fs from "node:fs";
import * as path from "node:path";

export interface ShowExampleInput {
  category: string;
}

export interface ShowExampleResult {
  found: boolean;
  category: string;
  content?: string;
  filename?: string;
  available_categories?: string[];
}

/** Map of category names to example filenames. */
const EXAMPLE_MAP: Record<string, string> = {
  minimal: "minimal.yaml",
  production: "production.yaml",
  "with-tools": "with-tools.yaml",
};

/**
 * Resolve the examples directory relative to the package root.
 * Walks up from the current file to find the repo root (where versions/ lives).
 */
function findExamplesDir(): string {
  // From src/tools/ walk up to the repo root
  let dir = path.resolve(import.meta.dir, "..", "..", "..");
  // If we're inside packages/adl-agent/src/tools, go up more to reach repo root
  while (dir !== "/" && !fs.existsSync(path.join(dir, "versions"))) {
    dir = path.dirname(dir);
  }
  return path.join(dir, "versions", "0.2.0", "examples");
}

/**
 * Load and return an example ADL document by category.
 */
export function showExample(input: ShowExampleInput): ShowExampleResult {
  const filename = EXAMPLE_MAP[input.category];

  if (!filename) {
    return {
      found: false,
      category: input.category,
      available_categories: Object.keys(EXAMPLE_MAP),
    };
  }

  const examplesDir = findExamplesDir();
  const filePath = path.join(examplesDir, filename);

  if (!fs.existsSync(filePath)) {
    return {
      found: false,
      category: input.category,
      available_categories: Object.keys(EXAMPLE_MAP),
    };
  }

  const content = fs.readFileSync(filePath, "utf-8");
  return {
    found: true,
    category: input.category,
    content,
    filename,
  };
}
