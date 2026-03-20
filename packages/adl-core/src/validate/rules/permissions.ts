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

  return errors;
}
