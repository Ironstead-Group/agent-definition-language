/**
 * Semantic rules: ADL-2005, ADL-2006, ADL-2007
 * Validates timestamps, URIs, and JSON Schema objects.
 */

import type { ADLDocument } from "../../types/document.js";
import { createError, type ADLError } from "../../types/errors.js";

/**
 * Check if a string is a valid ISO 8601 date-time.
 * Accepts both full date-time (with T separator) and date-only formats
 * that produce a valid Date.
 */
function isValidDateTime(value: string): boolean {
  const date = new Date(value);
  if (isNaN(date.getTime())) return false;
  // Must contain at least a date portion like YYYY-MM-DD
  return /^\d{4}-\d{2}-\d{2}/.test(value);
}

/**
 * Basic URI validation per RFC 3986 — must have a scheme.
 */
function isValidURI(value: string): boolean {
  // A URI must have a scheme (letters followed by colon)
  return /^[a-zA-Z][a-zA-Z0-9+\-.]*:/.test(value);
}

/**
 * Check if an object is a plausible JSON Schema.
 * A valid JSON Schema object should be a plain object.
 * We check for basic structural validity — must be a non-null object.
 */
function isPlausibleJsonSchema(value: unknown): boolean {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function checkFormats(doc: ADLDocument): ADLError[] {
  const errors: ADLError[] = [];

  // ADL-2005: Invalid timestamp format
  const timestampFields: Array<{
    value: string | undefined;
    pointer: string;
  }> = [
    {
      value: doc.lifecycle?.effective_date,
      pointer: "/lifecycle/effective_date",
    },
    { value: doc.lifecycle?.sunset_date, pointer: "/lifecycle/sunset_date" },
    {
      value: doc.security?.attestation?.issued_at,
      pointer: "/security/attestation/issued_at",
    },
    {
      value: doc.security?.attestation?.expires_at,
      pointer: "/security/attestation/expires_at",
    },
  ];

  for (const { value, pointer } of timestampFields) {
    if (typeof value === "string" && !isValidDateTime(value)) {
      errors.push(
        createError(
          "ADL-2005",
          `Invalid timestamp format: "${value}" at ${pointer}`,
          { pointer },
        ),
      );
    }
  }

  // ADL-2006: Invalid URI format
  const uriFields: Array<{ value: string | undefined; pointer: string }> = [
    { value: doc.id, pointer: "/id" },
    { value: doc.provider?.url, pointer: "/provider/url" },
    { value: doc.metadata?.documentation, pointer: "/metadata/documentation" },
    { value: doc.metadata?.repository, pointer: "/metadata/repository" },
    {
      value: doc.security?.authentication?.token_endpoint,
      pointer: "/security/authentication/token_endpoint",
    },
    { value: doc.lifecycle?.successor, pointer: "/lifecycle/successor" },
  ];

  for (const { value, pointer } of uriFields) {
    if (typeof value === "string" && value.length > 0 && !isValidURI(value)) {
      errors.push(
        createError(
          "ADL-2006",
          `Invalid URI format: "${value}" at ${pointer}`,
          { pointer },
        ),
      );
    }
  }

  // Resource URIs
  if (doc.resources) {
    for (let i = 0; i < doc.resources.length; i++) {
      const uri = doc.resources[i].uri;
      if (typeof uri === "string" && uri.length > 0 && !isValidURI(uri)) {
        errors.push(
          createError(
            "ADL-2006",
            `Invalid URI format: "${uri}" at /resources/${i}/uri`,
            { pointer: `/resources/${i}/uri` },
          ),
        );
      }
    }
  }

  // ADL-2007: Invalid JSON Schema
  if (doc.tools) {
    for (let i = 0; i < doc.tools.length; i++) {
      const tool = doc.tools[i];
      if (
        tool.parameters !== undefined &&
        !isPlausibleJsonSchema(tool.parameters)
      ) {
        errors.push(
          createError(
            "ADL-2007",
            `Tool "${tool.name}" parameters must be a valid JSON Schema object`,
            { pointer: `/tools/${i}/parameters` },
          ),
        );
      }
      if (tool.returns !== undefined && !isPlausibleJsonSchema(tool.returns)) {
        errors.push(
          createError(
            "ADL-2007",
            `Tool "${tool.name}" returns must be a valid JSON Schema object`,
            { pointer: `/tools/${i}/returns` },
          ),
        );
      }
    }
  }

  return errors;
}
