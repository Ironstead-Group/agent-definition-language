/**
 * Re-export MCP converter from @adl-spec/core with CLI-compatible interface.
 */

import {
  convertToMCP as coreConvert,
  type ADLDocument,
} from "@adl-spec/core";

export function convertToMCP(
  doc: Record<string, unknown>,
): Record<string, unknown> {
  return coreConvert(doc as unknown as ADLDocument) as unknown as Record<string, unknown>;
}
