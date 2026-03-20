/**
 * Re-export loader from @adl-spec/core with CLI-compatible interface.
 */

import { loadADLSync, type ADLError } from "@adl-spec/core";

export interface LoadResult {
  data: unknown;
  errors: ADLError[];
}

/**
 * Load and parse an ADL document from a file path.
 * Maintains backward compatibility with the original CLI interface.
 */
export function loadDocument(filePath: string): LoadResult {
  const { document, errors } = loadADLSync(filePath);
  return { data: document, errors };
}
