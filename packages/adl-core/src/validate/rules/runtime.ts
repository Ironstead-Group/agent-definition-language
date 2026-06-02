/**
 * Semantic rules: ADL-6003, ADL-6004, ADL-6005, ADL-6008 (ADL 0.3.0+)
 *
 * Validates runtime tool-invocation iteration limits, loop-detection windows,
 * and degradation responses/cause keys. These members are 0.3.0 additions, so
 * the rules are gated to documents declaring adl_spec >= 0.3.0.
 *
 * Some of these overlap with JSON Schema validation (minimum/enum/
 * patternProperties); like the ADL-2008..2015 rules they are implemented for
 * the spec-specific error codes in addition to the generic schema codes.
 */

import type { ADLDocument } from "../../types/document.js";
import { createError, type ADLError } from "../../types/errors.js";
import { specAtLeast } from "../version.js";

const DEGRADATION_ACTIONS = new Set(["halt", "pause", "fallback", "continue"]);
const CAUSE_KEY_RE = /^on_[a-z0-9_]+$/;

function isIntAtLeast(v: unknown, min: number): boolean {
  return typeof v === "number" && Number.isInteger(v) && v >= min;
}

export function checkRuntime(doc: ADLDocument): ADLError[] {
  const errors: ADLError[] = [];
  if (!specAtLeast(doc.adl_spec, 0, 3)) return errors;

  const ti = doc.runtime?.tool_invocation;
  if (ti) {
    // ADL-6004 (VAL-32): max_iterations / max_tool_calls_per_session >= 1
    for (const key of [
      "max_iterations",
      "max_tool_calls_per_session",
    ] as const) {
      const v = ti[key];
      if (v !== undefined && !isIntAtLeast(v, 1)) {
        errors.push(
          createError(
            "ADL-6004",
            `runtime.tool_invocation.${key} must be an integer >= 1 (got ${v})`,
            { pointer: `/runtime/tool_invocation/${key}` },
          ),
        );
      }
    }

    // ADL-6005 (VAL-33): loop_detection.window >= 2
    const window = ti.loop_detection?.window;
    if (window !== undefined && !isIntAtLeast(window, 2)) {
      errors.push(
        createError(
          "ADL-6005",
          `runtime.tool_invocation.loop_detection.window must be an integer >= 2 (got ${window})`,
          { pointer: `/runtime/tool_invocation/loop_detection/window` },
        ),
      );
    }

    // ADL-6003 (VAL-31): loop_detection.on_detected is a degradation response
    const onDetected = ti.loop_detection?.on_detected as
      | { action?: unknown }
      | undefined;
    if (
      onDetected &&
      typeof onDetected === "object" &&
      !DEGRADATION_ACTIONS.has(onDetected.action as string)
    ) {
      errors.push(
        createError(
          "ADL-6003",
          `Invalid degradation action "${onDetected.action}" (must be halt, pause, fallback, or continue)`,
          {
            pointer: `/runtime/tool_invocation/loop_detection/on_detected/action`,
          },
        ),
      );
    }
  }

  // ADL-6008 (VAL-36): cause keys; ADL-6003 (VAL-31): response actions
  const degradation = doc.runtime?.degradation;
  if (degradation && typeof degradation === "object") {
    for (const [cause, response] of Object.entries(degradation)) {
      if (cause === "extensions") continue;
      if (!CAUSE_KEY_RE.test(cause)) {
        errors.push(
          createError(
            "ADL-6008",
            `Invalid degradation cause key "${cause}" (must match ^on_[a-z0-9_]+$)`,
            { pointer: `/runtime/degradation/${cause}` },
          ),
        );
      }
      const action = (response as { action?: unknown } | undefined)?.action;
      if (
        response &&
        typeof response === "object" &&
        !DEGRADATION_ACTIONS.has(action as string)
      ) {
        errors.push(
          createError(
            "ADL-6003",
            `Invalid degradation action "${action}" for cause "${cause}" (must be halt, pause, fallback, or continue)`,
            { pointer: `/runtime/degradation/${cause}/action` },
          ),
        );
      }
    }
  }

  return errors;
}
