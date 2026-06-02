/**
 * Semantic rules: ADL-2016, ADL-2017, ADL-2018
 * Validates pattern syntax per spec Section 4.4.
 *
 * Pattern rules:
 * - Patterns consist of literal characters and wildcards (* and **)
 * - `*` matches within a single segment
 * - `**` matches across segments (ONLY valid in filesystem paths)
 * - Host patterns: `**` is NOT allowed; `*` does not cross dots
 * - Environment/command patterns: `**` is NOT allowed
 * - Patterns must not be empty
 * - Patterns must contain only printable ASCII (0x21-0x7E)
 */

import type { ADLDocument } from "../../types/document.js";
import { createError, type ADLError } from "../../types/errors.js";
import { specAtLeast } from "../version.js";

// Printable ASCII excluding control characters
const VALID_PATTERN_CHARS = /^[\x21-\x7e]+$/;

/**
 * Validate a pattern for non-filesystem context (no ** allowed).
 */
function validateNonFsPattern(
  pattern: string,
): { valid: boolean; reason?: string } {
  if (pattern.length === 0) {
    return { valid: false, reason: "Pattern must not be empty" };
  }
  if (!VALID_PATTERN_CHARS.test(pattern)) {
    return {
      valid: false,
      reason: "Pattern contains invalid characters (must be printable ASCII)",
    };
  }
  if (pattern.includes("**")) {
    return {
      valid: false,
      reason:
        "Multi-segment wildcard '**' is not allowed in this pattern context",
    };
  }
  return { valid: true };
}

/**
 * Validate a filesystem path pattern (** IS allowed).
 */
function validateFsPattern(
  pattern: string,
): { valid: boolean; reason?: string } {
  if (pattern.length === 0) {
    return { valid: false, reason: "Pattern must not be empty" };
  }
  if (!VALID_PATTERN_CHARS.test(pattern)) {
    return {
      valid: false,
      reason: "Pattern contains invalid characters (must be printable ASCII)",
    };
  }
  return { valid: true };
}

export function checkPermissions(doc: ADLDocument): ADLError[] {
  const errors: ADLError[] = [];

  // ADL-2016: Invalid host pattern syntax
  if (doc.permissions?.network?.allowed_hosts) {
    for (let i = 0; i < doc.permissions.network.allowed_hosts.length; i++) {
      const pattern = doc.permissions.network.allowed_hosts[i];
      const result = validateNonFsPattern(pattern);
      if (!result.valid) {
        errors.push(
          createError(
            "ADL-2016",
            `Invalid host pattern "${pattern}": ${result.reason}`,
            { pointer: `/permissions/network/allowed_hosts/${i}` },
          ),
        );
      }
    }
  }

  // ADL-2017: Invalid filesystem path pattern
  if (doc.permissions?.filesystem?.allowed_paths) {
    for (let i = 0; i < doc.permissions.filesystem.allowed_paths.length; i++) {
      const pathEntry = doc.permissions.filesystem.allowed_paths[i];
      const result = validateFsPattern(pathEntry.path);
      if (!result.valid) {
        errors.push(
          createError(
            "ADL-2017",
            `Invalid filesystem path pattern "${pathEntry.path}": ${result.reason}`,
            { pointer: `/permissions/filesystem/allowed_paths/${i}/path` },
          ),
        );
      }
    }
  }

  if (doc.permissions?.filesystem?.denied_paths) {
    for (let i = 0; i < doc.permissions.filesystem.denied_paths.length; i++) {
      const pattern = doc.permissions.filesystem.denied_paths[i];
      const result = validateFsPattern(pattern);
      if (!result.valid) {
        errors.push(
          createError(
            "ADL-2017",
            `Invalid filesystem denied path pattern "${pattern}": ${result.reason}`,
            { pointer: `/permissions/filesystem/denied_paths/${i}` },
          ),
        );
      }
    }
  }

  // ADL-2018: Invalid environment variable pattern
  if (doc.permissions?.environment?.allowed_variables) {
    for (
      let i = 0;
      i < doc.permissions.environment.allowed_variables.length;
      i++
    ) {
      const pattern = doc.permissions.environment.allowed_variables[i];
      const result = validateNonFsPattern(pattern);
      if (!result.valid) {
        errors.push(
          createError(
            "ADL-2018",
            `Invalid environment variable pattern "${pattern}": ${result.reason}`,
            { pointer: `/permissions/environment/allowed_variables/${i}` },
          ),
        );
      }
    }
  }

  if (doc.permissions?.environment?.denied_variables) {
    for (
      let i = 0;
      i < doc.permissions.environment.denied_variables.length;
      i++
    ) {
      const pattern = doc.permissions.environment.denied_variables[i];
      const result = validateNonFsPattern(pattern);
      if (!result.valid) {
        errors.push(
          createError(
            "ADL-2018",
            `Invalid environment denied variable pattern "${pattern}": ${result.reason}`,
            { pointer: `/permissions/environment/denied_variables/${i}` },
          ),
        );
      }
    }
  }

  // Also validate execution command patterns (** not allowed per Section 4.4)
  if (doc.permissions?.execution?.allowed_commands) {
    for (
      let i = 0;
      i < doc.permissions.execution.allowed_commands.length;
      i++
    ) {
      const pattern = doc.permissions.execution.allowed_commands[i];
      if (pattern.includes("**")) {
        errors.push(
          createError(
            "ADL-2016",
            `Invalid command pattern "${pattern}": multi-segment wildcard '**' is not allowed`,
            { pointer: `/permissions/execution/allowed_commands/${i}` },
          ),
        );
      }
    }
  }

  // ADL 0.3.0+ permission rules: budget caps (ADL-6001/6002) and the
  // delegation envelope (ADL-6006/6007). These members are 0.3.0 additions.
  if (specAtLeast(doc.adl_spec, 0, 3)) {
    const budget = doc.permissions?.resource_limits?.budget;
    if (budget) {
      const dims = ["tokens", "cost_usd", "wall_clock_sec"] as const;
      for (const dim of dims) {
        const d = budget[dim];
        if (!d) continue;
        // ADL-6001 (VAL-29): every present cap must be a number > 0
        for (const cap of ["per_session", "per_day"] as const) {
          const v = d[cap];
          if (v !== undefined && (typeof v !== "number" || !(v > 0))) {
            errors.push(
              createError(
                "ADL-6001",
                `Budget cap ${dim}.${cap} must be a number greater than 0`,
                {
                  pointer: `/permissions/resource_limits/budget/${dim}/${cap}`,
                },
              ),
            );
          }
        }
        // ADL-6002 (VAL-30): per_session <= per_day when both are present
        if (
          typeof d.per_session === "number" &&
          typeof d.per_day === "number" &&
          d.per_session > d.per_day
        ) {
          errors.push(
            createError(
              "ADL-6002",
              `Budget ${dim}.per_session (${d.per_session}) exceeds per_day (${d.per_day})`,
              {
                pointer: `/permissions/resource_limits/budget/${dim}/per_session`,
              },
            ),
          );
        }
      }
    }

    const delegation = doc.permissions?.delegation;
    if (delegation) {
      // ADL-6006 (VAL-34): match/deny patterns conform to Section 4.4
      for (const key of ["match", "deny"] as const) {
        const patterns = delegation[key];
        if (!patterns) continue;
        for (let i = 0; i < patterns.length; i++) {
          const result = validateNonFsPattern(patterns[i]);
          if (!result.valid) {
            errors.push(
              createError(
                "ADL-6006",
                `Invalid delegation ${key} pattern "${patterns[i]}": ${result.reason}`,
                { pointer: `/permissions/delegation/${key}/${i}` },
              ),
            );
          }
        }
      }
      // ADL-6007 (VAL-35): max_depth, when present, must be an integer >= 1
      if (delegation.max_depth !== undefined) {
        const md = delegation.max_depth;
        if (typeof md !== "number" || !Number.isInteger(md) || md < 1) {
          errors.push(
            createError(
              "ADL-6007",
              `Delegation max_depth must be an integer >= 1 (got ${md})`,
              { pointer: `/permissions/delegation/max_depth` },
            ),
          );
        }
      }
    }

    // ADL-6009 (VAL-35a): sub-agent (persona) declarations — name presence,
    // uniqueness within the array, and tools as a subset of the parent's.
    const subAgents = doc.permissions?.sub_agents;
    if (Array.isArray(subAgents)) {
      const parentTools = new Set((doc.tools ?? []).map((t) => t.name));
      const seenNames = new Set<string>();
      for (let i = 0; i < subAgents.length; i++) {
        const sa = subAgents[i];
        if (typeof sa?.name !== "string" || sa.name.length === 0) {
          errors.push(
            createError(
              "ADL-6009",
              `Sub-agent at index ${i} must declare a non-empty name`,
              { pointer: `/permissions/sub_agents/${i}/name` },
            ),
          );
        } else {
          if (seenNames.has(sa.name)) {
            errors.push(
              createError(
                "ADL-6009",
                `Duplicate sub-agent name "${sa.name}"`,
                { pointer: `/permissions/sub_agents/${i}/name` },
              ),
            );
          }
          seenNames.add(sa.name);
        }
        if (Array.isArray(sa?.tools)) {
          for (let j = 0; j < sa.tools.length; j++) {
            const tool = sa.tools[j];
            if (!parentTools.has(tool)) {
              errors.push(
                createError(
                  "ADL-6009",
                  `Sub-agent "${sa.name ?? i}" references tool "${tool}" not in the parent's tools`,
                  { pointer: `/permissions/sub_agents/${i}/tools/${j}` },
                ),
              );
            }
          }
        }
      }
    }
  }

  return errors;
}
