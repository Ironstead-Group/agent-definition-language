/**
 * Orchestrates semantic validation rule modules.
 */

import type { ADLDocument } from "../types/document.js";
import type { ADLError } from "../types/errors.js";
import { checkDuplicates } from "./rules/duplicates.js";
import { checkDataClassification } from "./rules/data-classification.js";
import { checkLifecycle } from "./rules/lifecycle.js";
import { checkPatterns } from "./rules/patterns.js";
import { checkModelAndEnums } from "./rules/model-and-enums.js";
import { checkFormats } from "./rules/formats.js";
import { checkPermissions } from "./rules/permissions.js";
import { checkSecurity } from "./rules/security.js";
import { checkProfiles } from "./rules/profiles.js";

export function validateSemantic(doc: ADLDocument): ADLError[] {
  return [
    ...checkPatterns(doc),
    ...checkDuplicates(doc),
    ...checkDataClassification(doc),
    ...checkModelAndEnums(doc),
    ...checkFormats(doc),
    ...checkPermissions(doc),
    ...checkSecurity(doc),
    ...checkProfiles(doc),
    ...checkLifecycle(doc),
  ];
}
