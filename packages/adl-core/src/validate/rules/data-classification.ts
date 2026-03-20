/**
 * Semantic rules: ADL-2020/2021/2022/2023 — data classification checks.
 */

import type { ADLDocument } from "../../types/document.js";
import type { DataClassification } from "../../types/document.js";
import { createError, type ADLError } from "../../types/errors.js";

const VALID_SENSITIVITIES = [
  "public",
  "internal",
  "confidential",
  "restricted",
];
const VALID_CATEGORIES = [
  "pii",
  "phi",
  "financial",
  "credentials",
  "intellectual_property",
  "regulatory",
];

const SENSITIVITY_ORDER: Record<string, number> = {
  public: 0,
  internal: 1,
  confidential: 2,
  restricted: 3,
};

export function checkDataClassification(doc: ADLDocument): ADLError[] {
  const errors: ADLError[] = [];
  const dc = doc.data_classification;
  if (!dc) return errors;

  // ADL-2020: Invalid sensitivity level
  if (dc.sensitivity && !VALID_SENSITIVITIES.includes(dc.sensitivity)) {
    errors.push(
      createError(
        "ADL-2020",
        `Invalid data classification sensitivity: "${dc.sensitivity}". Valid: ${VALID_SENSITIVITIES.join(", ")}`,
        { pointer: "/data_classification/sensitivity" },
      ),
    );
  }

  // ADL-2021: Invalid category values
  if (dc.categories) {
    for (let i = 0; i < dc.categories.length; i++) {
      const cat = dc.categories[i];
      if (!VALID_CATEGORIES.includes(cat)) {
        errors.push(
          createError(
            "ADL-2021",
            `Invalid data classification category: "${cat}". Valid: ${VALID_CATEGORIES.join(", ")}`,
            { pointer: `/data_classification/categories/${i}` },
          ),
        );
      }
    }
  }

  // ADL-2022: Retention min_days exceeds max_days
  if (dc.retention) {
    const { min_days, max_days } = dc.retention;
    if (
      typeof min_days === "number" &&
      typeof max_days === "number" &&
      min_days > max_days
    ) {
      errors.push(
        createError(
          "ADL-2022",
          `Retention min_days (${min_days}) exceeds max_days (${max_days})`,
          { pointer: "/data_classification/retention" },
        ),
      );
    }
  }

  // ADL-2023: High-water mark violation
  if (dc.sensitivity) {
    const topLevel = SENSITIVITY_ORDER[dc.sensitivity] ?? -1;

    const checkItems = (
      items: Array<{ data_classification?: DataClassification }> | undefined,
      kind: string,
    ) => {
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        const itemDc = items[i].data_classification;
        if (itemDc?.sensitivity) {
          const itemLevel = SENSITIVITY_ORDER[itemDc.sensitivity] ?? -1;
          if (itemLevel > topLevel) {
            errors.push(
              createError(
                "ADL-2023",
                `${kind}[${i}] sensitivity "${itemDc.sensitivity}" exceeds top-level sensitivity "${dc.sensitivity}" (high-water mark violation)`,
                {
                  pointer: `/${kind}/${i}/data_classification/sensitivity`,
                },
              ),
            );
          }
        }
      }
    };

    checkItems(doc.tools, "tools");
    checkItems(doc.resources, "resources");
  }

  return errors;
}
