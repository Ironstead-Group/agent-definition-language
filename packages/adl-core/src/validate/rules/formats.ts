/**
 * Semantic rules: ADL-2005, ADL-2006, ADL-2007
 * Validates timestamps, URIs, and JSON Schema objects.
 */

import type { ADLDocument } from "../../types/document.js";
import { createError, type ADLError } from "../../types/errors.js";
import { specAtLeast } from "../version.js";

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
 * ADL URN structure per the `adl-urn` production (spec Appendix D).
 * Two type-discriminated forms:
 *   agent:   urn:adl:agent:{namespace}:{name}:{version}   (version is semver)
 *   profile: urn:adl:profile:{name}:{version}             (version is MAJOR.MINOR[.PATCH])
 * The {type} segment (VAL-37) MUST be "agent" or "profile".
 */
const ADL_AGENT_URN_RE =
  /^urn:adl:agent:[a-z0-9]+:[a-z0-9][a-z0-9-]*:[0-9]+\.[0-9]+\.[0-9]+$/;
const ADL_PROFILE_URN_RE =
  /^urn:adl:profile:[a-z0-9][a-z0-9-]*:[0-9]+\.[0-9]+(\.[0-9]+)?$/;

function isValidAdlUrn(value: string): boolean {
  return ADL_AGENT_URN_RE.test(value) || ADL_PROFILE_URN_RE.test(value);
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

  // ADL-2025 (VAL-37): from ADL 0.3.0, any urn:adl: value MUST conform to the
  // adl-urn production — i.e. carry a {type} segment of "agent" or "profile".
  // Pre-0.3.0 documents used the type-less URN form and are exempt.
  if (specAtLeast(doc.adl_spec, 0, 3)) {
    const adlUrnFields: Array<{ value: string | undefined; pointer: string }> = [
      { value: doc.id, pointer: "/id" },
      { value: doc.lifecycle?.successor, pointer: "/lifecycle/successor" },
    ];

    for (const { value, pointer } of adlUrnFields) {
      if (
        typeof value === "string" &&
        value.startsWith("urn:adl:") &&
        !isValidAdlUrn(value)
      ) {
        errors.push(
          createError(
            "ADL-2025",
            `Invalid ADL URN "${value}" at ${pointer}: must be urn:adl:agent:{namespace}:{name}:{version} or urn:adl:profile:{name}:{version}`,
            { pointer },
          ),
        );
      }
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
