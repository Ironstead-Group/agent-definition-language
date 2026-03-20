/**
 * ADL concept explanations — loads from language-agnostic JSON.
 */

import * as fs from "node:fs";
import * as path from "node:path";

export interface ConceptEntry {
  title: string;
  summary: string;
  details: string;
}

const jsonPath = path.resolve(import.meta.dir, "../../knowledge/concepts.json");
export const concepts: Record<string, ConceptEntry> = JSON.parse(
  fs.readFileSync(jsonPath, "utf-8"),
);
