/**
 * Tool: validate_document — parse and validate an ADL document string.
 */

import { parseADL, validateDocument as coreValidate } from "@adl-spec/core";
import type { ADLError } from "@adl-spec/core";

export interface ValidateDocumentInput {
  document: string;
}

export interface ValidateDocumentResult {
  valid: boolean;
  parse_errors: ExplainedError[];
  validation_errors: ExplainedError[];
  summary: string;
}

export interface ExplainedError {
  code: string;
  title: string;
  detail: string;
  explanation: string;
}

/**
 * Parse and validate an ADL document, returning errors with plain-language explanations.
 */
export function validateDocumentTool(
  input: ValidateDocumentInput,
): ValidateDocumentResult {
  const { document, errors: parseErrors } = parseADL(input.document);

  if (parseErrors.length > 0 || !document) {
    return {
      valid: false,
      parse_errors: parseErrors.map(explainError),
      validation_errors: [],
      summary: `Document could not be parsed. Found ${parseErrors.length} parse error(s).`,
    };
  }

  const { valid, errors: validationErrors } = coreValidate(document);

  return {
    valid,
    parse_errors: [],
    validation_errors: validationErrors.map(explainError),
    summary: valid
      ? "Document is valid ADL."
      : `Document has ${validationErrors.length} validation error(s).`,
  };
}

function explainError(error: ADLError): ExplainedError {
  return {
    code: error.code,
    title: error.title,
    detail: error.detail,
    explanation: getErrorExplanation(error.code),
  };
}

function getErrorExplanation(code: string): string {
  const explanations: Record<string, string> = {
    "ADL-1001":
      "The document contains invalid syntax. Check for missing commas, brackets, or quoting issues.",
    "ADL-1002":
      "The document root must be a mapping (YAML) or object (JSON), not an array or scalar.",
    "ADL-1003":
      "A required field is missing. The minimum required fields are: adl_spec, name, description, version, and data_classification.",
    "ADL-1004":
      "A field has the wrong type. Check that strings are quoted, numbers are unquoted, and arrays use the correct syntax.",
    "ADL-1005":
      "A field has an invalid enum value. Check the spec for the list of allowed values.",
    "ADL-1006":
      "A field value does not match the expected pattern. Check the spec for the required format.",
    "ADL-2001":
      "The adl_spec version is not supported. Currently supported versions are 0.1.0 and 0.2.0.",
    "ADL-2002":
      "Two or more tools have the same name. Each tool must have a unique name.",
    "ADL-2003":
      "Two or more resources have the same name. Each resource must have a unique name.",
    "ADL-2020":
      "The data_classification.sensitivity value is not valid. Use one of: public, internal, confidential, restricted.",
    "ADL-2021":
      "A data_classification.categories value is not recognized. Check the spec for valid categories.",
    "ADL-2022":
      "The retention min_days is greater than max_days. Min must be less than or equal to max.",
    "ADL-2023":
      "A tool's data classification is less sensitive than the document level, violating the high-water mark principle.",
    "ADL-5003":
      "The sunset_date is before the effective_date. The sunset date must come after the effective date.",
  };

  return (
    explanations[code] ??
    "Refer to the ADL specification for details on this error code."
  );
}
