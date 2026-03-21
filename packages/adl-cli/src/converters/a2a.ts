/**
 * Re-export A2A converter from @adl-spec/core with CLI-compatible interface.
 */

import {
  convertToA2A as coreConvert,
  type ADLDocument,
} from "@adl-spec/core";

export function convertToA2A(
  doc: Record<string, unknown>,
): Record<string, unknown> {
  return coreConvert(doc as unknown as ADLDocument) as unknown as Record<string, unknown>;
}
