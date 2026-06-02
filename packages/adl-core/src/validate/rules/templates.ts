/**
 * Semantic rule: ADL-2024 (ADL 0.3.0+)
 *
 * A system_prompt template that references a {{variable}} not present in its
 * `variables` map is an error (spec Section 7.2). A `\{{` escape is a literal
 * "{{" and is not treated as a variable reference.
 */

import type { ADLDocument } from "../../types/document.js";
import { createError, type ADLError } from "../../types/errors.js";
import { specAtLeast } from "../version.js";

// {{name}} not preceded by a backslash; name per the template-var ABNF.
const TEMPLATE_VAR_RE = /(?<!\\)\{\{([A-Za-z][A-Za-z0-9_]*)\}\}/g;

export function checkTemplates(doc: ADLDocument): ADLError[] {
  const errors: ADLError[] = [];
  if (!specAtLeast(doc.adl_spec, 0, 3)) return errors;

  const sp = doc.system_prompt;
  // Only the object form declares a variables map.
  if (sp && typeof sp === "object" && typeof sp.template === "string") {
    const declared = new Set(Object.keys(sp.variables ?? {}));
    const reported = new Set<string>();
    for (const m of sp.template.matchAll(TEMPLATE_VAR_RE)) {
      const name = m[1];
      if (!declared.has(name) && !reported.has(name)) {
        reported.add(name);
        errors.push(
          createError(
            "ADL-2024",
            `Template references undefined variable "${name}" not present in system_prompt.variables`,
            { pointer: `/system_prompt/template` },
          ),
        );
      }
    }
  }

  return errors;
}
