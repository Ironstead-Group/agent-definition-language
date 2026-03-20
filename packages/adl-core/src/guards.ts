/**
 * Runtime type guards for ADL types.
 */

import type { ADLDocument } from "./types/document.js";

/**
 * Check if a value is a valid ADL document shape (has required fields).
 */
export function isADLDocument(value: unknown): value is ADLDocument {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const obj = value as Record<string, unknown>;
  return (
    typeof obj.adl_spec === "string" &&
    typeof obj.name === "string" &&
    typeof obj.description === "string" &&
    typeof obj.version === "string" &&
    typeof obj.data_classification === "object" &&
    obj.data_classification !== null
  );
}
