/**
 * Tool: compare_formats — compare ADL with other agent description formats.
 */

import { comparisons, type ComparisonEntry } from "../knowledge/comparisons.js";

export interface CompareFormatsInput {
  format: string;
}

export interface CompareFormatsResult {
  found: boolean;
  format_key: string;
  comparison?: ComparisonEntry;
  available_formats?: string[];
}

/**
 * Look up a format comparison by key.
 */
export function compareFormats(
  input: CompareFormatsInput,
): CompareFormatsResult {
  const key = normalizeKey(input.format);

  if (comparisons[key]) {
    return { found: true, format_key: key, comparison: comparisons[key] };
  }

  // Fuzzy match against format names
  const match = Object.entries(comparisons).find(([k, v]) => {
    const lower = input.format.toLowerCase();
    return (
      k.includes(lower) ||
      lower.includes(k) ||
      v.format.toLowerCase().includes(lower)
    );
  });

  if (match) {
    return { found: true, format_key: match[0], comparison: match[1] };
  }

  return {
    found: false,
    format_key: input.format,
    available_formats: Object.keys(comparisons),
  };
}

function normalizeKey(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[\s-]+/g, "_");
}
