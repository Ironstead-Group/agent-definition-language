/**
 * Semantic rules: ADL-2002/2003/2004 — duplicate name detection.
 */

import type { ADLDocument } from "../../types/document.js";
import { createError, type ADLError } from "../../types/errors.js";

export function checkDuplicates(doc: ADLDocument): ADLError[] {
  const errors: ADLError[] = [];

  // ADL-2002: Duplicate tool names
  if (doc.tools) {
    const seen = new Set<string>();
    for (let i = 0; i < doc.tools.length; i++) {
      const name = doc.tools[i].name;
      if (seen.has(name)) {
        errors.push(
          createError("ADL-2002", `Duplicate tool name: "${name}"`, {
            pointer: `/tools/${i}/name`,
          }),
        );
      }
      seen.add(name);
    }
  }

  // ADL-2003: Duplicate resource names
  if (doc.resources) {
    const seen = new Set<string>();
    for (let i = 0; i < doc.resources.length; i++) {
      const name = doc.resources[i].name;
      if (seen.has(name)) {
        errors.push(
          createError("ADL-2003", `Duplicate resource name: "${name}"`, {
            pointer: `/resources/${i}/name`,
          }),
        );
      }
      seen.add(name);
    }
  }

  // ADL-2004: Duplicate prompt names
  if (doc.prompts) {
    const seen = new Set<string>();
    for (let i = 0; i < doc.prompts.length; i++) {
      const name = doc.prompts[i].name;
      if (seen.has(name)) {
        errors.push(
          createError("ADL-2004", `Duplicate prompt name: "${name}"`, {
            pointer: `/prompts/${i}/name`,
          }),
        );
      }
      seen.add(name);
    }
  }

  return errors;
}
