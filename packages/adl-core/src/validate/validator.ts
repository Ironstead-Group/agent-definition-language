/**
 * Main validation entry point — combines schema + semantic validation.
 */

import type { ADLDocument } from "../types/document.js";
import type { ADLError } from "../types/errors.js";
import { validateSchema } from "./schema-validator.js";
import { validateSemantic } from "./semantic-validator.js";

export interface ValidateOptions {
  /** Skip schema validation (only run semantic checks). */
  skipSchema?: boolean;
  /** Skip semantic validation (only run schema checks). */
  skipSemantic?: boolean;
}

export interface ValidationResult {
  valid: boolean;
  errors: ADLError[];
}

/**
 * Validate an ADL document against the JSON Schema and semantic rules.
 */
export function validateDocument(
  doc: ADLDocument,
  options?: ValidateOptions,
): ValidationResult {
  const errors: ADLError[] = [];

  if (!options?.skipSchema) {
    errors.push(...validateSchema(doc));
  }

  if (!options?.skipSemantic) {
    errors.push(...validateSemantic(doc));
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
