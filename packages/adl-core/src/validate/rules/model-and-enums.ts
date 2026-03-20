/**
 * Semantic rules: ADL-2008 through ADL-2015
 * Validates enum values and patterns with spec-specific error codes.
 *
 * These overlap with JSON Schema enum/pattern validation (ADL-1005/1006),
 * but the spec defines dedicated codes for each field.
 */

import type { ADLDocument } from "../../types/document.js";
import { createError, type ADLError } from "../../types/errors.js";

const TOOL_NAME_PATTERN = /^[a-z][a-z0-9_]*$/;

const VALID_RESOURCE_TYPES = [
  "vector_store",
  "knowledge_base",
  "file",
  "api",
  "database",
];

const VALID_AUTH_TYPES = ["none", "api_key", "oauth2", "oidc", "mtls"];

const VALID_ATTESTATION_TYPES = [
  "self",
  "third_party",
  "verifiable_credential",
];

const VALID_ERROR_ACTIONS = ["abort", "continue", "retry"];

const VALID_OUTPUT_FORMATS = ["text", "json", "markdown", "html"];

const VALID_CAPABILITIES = [
  "function_calling",
  "vision",
  "code_execution",
  "streaming",
];

export function checkModelAndEnums(doc: ADLDocument): ADLError[] {
  const errors: ADLError[] = [];

  // ADL-2008: Invalid tool name pattern
  if (doc.tools) {
    for (let i = 0; i < doc.tools.length; i++) {
      const name = doc.tools[i].name;
      if (typeof name === "string" && !TOOL_NAME_PATTERN.test(name)) {
        errors.push(
          createError(
            "ADL-2008",
            `Tool name "${name}" does not match pattern ^[a-z][a-z0-9_]*$`,
            { pointer: `/tools/${i}/name` },
          ),
        );
      }
    }
  }

  // ADL-2009: Invalid resource type value
  if (doc.resources) {
    for (let i = 0; i < doc.resources.length; i++) {
      const type = doc.resources[i].type;
      if (typeof type === "string" && !VALID_RESOURCE_TYPES.includes(type)) {
        errors.push(
          createError(
            "ADL-2009",
            `Invalid resource type "${type}". Valid: ${VALID_RESOURCE_TYPES.join(", ")}`,
            { pointer: `/resources/${i}/type` },
          ),
        );
      }
    }
  }

  // ADL-2010: Temperature out of range
  if (doc.model?.temperature !== undefined) {
    const temp = doc.model.temperature;
    if (typeof temp === "number" && (temp < 0.0 || temp > 2.0)) {
      errors.push(
        createError(
          "ADL-2010",
          `Temperature ${temp} is out of range. Must be between 0.0 and 2.0`,
          { pointer: "/model/temperature" },
        ),
      );
    }
  }

  // ADL-2011: Invalid authentication type
  if (doc.security?.authentication?.type) {
    const type = doc.security.authentication.type;
    if (!VALID_AUTH_TYPES.includes(type)) {
      errors.push(
        createError(
          "ADL-2011",
          `Invalid authentication type "${type}". Valid: ${VALID_AUTH_TYPES.join(", ")}`,
          { pointer: "/security/authentication/type" },
        ),
      );
    }
  }

  // ADL-2012: Invalid attestation type
  if (doc.security?.attestation?.type) {
    const type = doc.security.attestation.type;
    if (!VALID_ATTESTATION_TYPES.includes(type)) {
      errors.push(
        createError(
          "ADL-2012",
          `Invalid attestation type "${type}". Valid: ${VALID_ATTESTATION_TYPES.join(", ")}`,
          { pointer: "/security/attestation/type" },
        ),
      );
    }
  }

  // ADL-2013: Invalid error handling action
  if (doc.runtime?.error_handling?.on_tool_error) {
    const action = doc.runtime.error_handling.on_tool_error;
    if (!VALID_ERROR_ACTIONS.includes(action)) {
      errors.push(
        createError(
          "ADL-2013",
          `Invalid error handling action "${action}". Valid: ${VALID_ERROR_ACTIONS.join(", ")}`,
          { pointer: "/runtime/error_handling/on_tool_error" },
        ),
      );
    }
  }

  // ADL-2014: Invalid output format
  if (doc.runtime?.output_handling?.format) {
    const format = doc.runtime.output_handling.format;
    if (!VALID_OUTPUT_FORMATS.includes(format)) {
      errors.push(
        createError(
          "ADL-2014",
          `Invalid output format "${format}". Valid: ${VALID_OUTPUT_FORMATS.join(", ")}`,
          { pointer: "/runtime/output_handling/format" },
        ),
      );
    }
  }

  // ADL-2015: Invalid model capability
  if (doc.model?.capabilities) {
    for (let i = 0; i < doc.model.capabilities.length; i++) {
      const cap = doc.model.capabilities[i];
      if (!VALID_CAPABILITIES.includes(cap)) {
        errors.push(
          createError(
            "ADL-2015",
            `Invalid model capability "${cap}". Valid: ${VALID_CAPABILITIES.join(", ")}`,
            { pointer: `/model/capabilities/${i}` },
          ),
        );
      }
    }
  }

  return errors;
}
