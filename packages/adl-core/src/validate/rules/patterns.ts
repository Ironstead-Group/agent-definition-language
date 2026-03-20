/**
 * Semantic rules: version check and other pattern-based validations.
 */

import type { ADLDocument } from "../../types/document.js";
import { createError, type ADLError } from "../../types/errors.js";
import { SUPPORTED_VERSIONS } from "../../schemas/registry.js";

export function checkPatterns(doc: ADLDocument): ADLError[] {
  const errors: ADLError[] = [];

  // ADL-2001: Unsupported version
  if (doc.adl_spec && !SUPPORTED_VERSIONS.includes(doc.adl_spec)) {
    errors.push(
      createError(
        "ADL-2001",
        `Unsupported ADL version "${doc.adl_spec}". Supported: ${SUPPORTED_VERSIONS.join(", ")}`,
        { pointer: "/adl_spec" },
      ),
    );
  }

  return errors;
}
