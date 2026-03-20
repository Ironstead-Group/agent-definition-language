/**
 * Semantic rules: ADL-5001, ADL-5002, ADL-5003 — lifecycle checks.
 */

import type { ADLDocument } from "../../types/document.js";
import { createError, type ADLError } from "../../types/errors.js";

const VALID_LIFECYCLE_STATUSES = ["draft", "active", "deprecated", "retired"];

export function checkLifecycle(doc: ADLDocument): ADLError[] {
  const errors: ADLError[] = [];
  const lifecycle = doc.lifecycle;
  if (!lifecycle) return errors;

  // ADL-5001: Invalid lifecycle status value
  if (
    lifecycle.status &&
    !VALID_LIFECYCLE_STATUSES.includes(lifecycle.status)
  ) {
    errors.push(
      createError(
        "ADL-5001",
        `Invalid lifecycle status "${lifecycle.status}". Valid: ${VALID_LIFECYCLE_STATUSES.join(", ")}`,
        { pointer: "/lifecycle/status" },
      ),
    );
  }

  // ADL-5002: Successor present on active/draft agent
  // Per spec: "Member 'successor' is only valid when lifecycle.status is 'retired'"
  // The spec example shows it's also valid for 'deprecated'
  if (lifecycle.successor) {
    const status = lifecycle.status;
    if (status === "draft" || status === "active") {
      errors.push(
        createError(
          "ADL-5002",
          `Successor is only valid when lifecycle status is "deprecated" or "retired", got "${status}"`,
          { pointer: "/lifecycle/successor" },
        ),
      );
    }
  }

  // ADL-5003: sunset_date must be after effective_date
  if (lifecycle.effective_date && lifecycle.sunset_date) {
    const effective = new Date(lifecycle.effective_date);
    const sunset = new Date(lifecycle.sunset_date);
    if (sunset <= effective) {
      errors.push(
        createError(
          "ADL-5003",
          `sunset_date (${lifecycle.sunset_date}) must be after effective_date (${lifecycle.effective_date})`,
          { pointer: "/lifecycle/sunset_date" },
        ),
      );
    }
  }

  return errors;
}
