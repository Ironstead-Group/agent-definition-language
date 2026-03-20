/**
 * Format comparison data — loads from language-agnostic JSON.
 */

import * as fs from "node:fs";
import * as path from "node:path";

export interface ComparisonEntry {
  format: string;
  relationship: string;
  strengths: string;
  limitations: string;
}

const jsonPath = path.resolve(import.meta.dir, "../../knowledge/comparisons.json");
export const comparisons: Record<string, ComparisonEntry> = JSON.parse(
  fs.readFileSync(jsonPath, "utf-8"),
);
