/**
 * Re-export validator from @adl-spec/core with CLI-compatible interface.
 */

import {
  validateDocument as coreValidate,
  isADLDocument,
  type ADLError,
} from "@adl-spec/core";

/**
 * Validate an ADL document against the JSON Schema and run semantic checks.
 * Maintains backward compatibility with the original CLI interface.
 */
export function validateDocument(doc: Record<string, unknown>): ADLError[] {
  if (!isADLDocument(doc)) {
    return coreValidate(doc as any).errors;
  }
  return coreValidate(doc).errors;
}
