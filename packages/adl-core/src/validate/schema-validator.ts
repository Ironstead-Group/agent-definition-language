/**
 * AJV-based JSON Schema validation for ADL documents.
 */

import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import type { ADLDocument } from "../types/document.js";
import { createError, type ADLError } from "../types/errors.js";
import { getSchema, isSupportedVersion } from "../schemas/registry.js";

/**
 * Validate an ADL document against the appropriate JSON Schema for its version.
 */
export function validateSchema(doc: ADLDocument): ADLError[] {
  const version = doc.adl_spec;
  const schema = getSchema(version);

  if (!schema) {
    // If version is not supported, semantic validator will catch it.
    // Fall back to latest schema for structural validation.
    return validateAgainstSchema(doc, getSchema("0.2.0")!);
  }

  return validateAgainstSchema(doc, schema);
}

function validateAgainstSchema(
  doc: ADLDocument,
  schema: object,
): ADLError[] {
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  addFormats(ajv);

  const validate = ajv.compile(schema);
  const valid = validate(doc);

  if (valid) return [];

  const errors: ADLError[] = [];
  for (const err of validate.errors ?? []) {
    const pointer = err.instancePath || "/";
    const keyword = err.keyword;

    let code: string;
    let detail: string;

    switch (keyword) {
      case "required":
        code = "ADL-1003";
        detail = `Missing required member: ${err.params?.missingProperty}`;
        break;
      case "type":
        code = "ADL-1004";
        detail = `Expected type ${err.params?.type} at ${pointer}`;
        break;
      case "enum":
        code = "ADL-1005";
        detail = `Invalid value at ${pointer}. Allowed: ${(err.params?.allowedValues as string[])?.join(", ")}`;
        break;
      case "pattern":
        code = "ADL-1006";
        detail = `Value at ${pointer} does not match pattern: ${err.params?.pattern}`;
        break;
      case "additionalProperties":
        code = "ADL-1004";
        detail = `Unknown property "${err.params?.additionalProperty}" at ${pointer}`;
        break;
      case "format":
        code = "ADL-1006";
        detail = `Invalid format "${err.params?.format}" at ${pointer}`;
        break;
      default:
        code = "ADL-1004";
        detail = err.message ?? `Validation error at ${pointer}`;
    }

    errors.push(createError(code, detail, { pointer }));
  }

  return errors;
}
