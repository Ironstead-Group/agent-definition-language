import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import adlSchema from "./schema.json";
import { createError, type ADLError } from "./errors.js";

const SUPPORTED_VERSIONS = ["0.1.0"];

/**
 * Validate an ADL document against the JSON Schema and run semantic checks.
 */
export function validateDocument(doc: Record<string, unknown>): ADLError[] {
  const errors: ADLError[] = [];

  // Schema validation via AJV
  errors.push(...validateSchema(doc));

  // Semantic checks beyond JSON Schema
  errors.push(...semanticChecks(doc));

  return errors;
}

function validateSchema(doc: Record<string, unknown>): ADLError[] {
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  addFormats(ajv);

  const validate = ajv.compile(adlSchema);
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

function semanticChecks(doc: Record<string, unknown>): ADLError[] {
  const errors: ADLError[] = [];

  // ADL-2001: Unsupported version
  if (
    typeof doc.adl_spec === "string" &&
    !SUPPORTED_VERSIONS.includes(doc.adl_spec)
  ) {
    errors.push(
      createError(
        "ADL-2001",
        `Unsupported ADL version "${doc.adl_spec}". Supported: ${SUPPORTED_VERSIONS.join(", ")}`,
        { pointer: "/adl_spec" },
      ),
    );
  }

  // ADL-2002: Duplicate tool names
  if (Array.isArray(doc.tools)) {
    const toolNames = new Set<string>();
    for (let i = 0; i < doc.tools.length; i++) {
      const tool = doc.tools[i] as Record<string, unknown>;
      const name = tool?.name;
      if (typeof name === "string") {
        if (toolNames.has(name)) {
          errors.push(
            createError("ADL-2002", `Duplicate tool name: "${name}"`, {
              pointer: `/tools/${i}/name`,
            }),
          );
        }
        toolNames.add(name);
      }
    }
  }

  // ADL-2003: Duplicate resource names
  if (Array.isArray(doc.resources)) {
    const resourceNames = new Set<string>();
    for (let i = 0; i < doc.resources.length; i++) {
      const resource = doc.resources[i] as Record<string, unknown>;
      const name = resource?.name;
      if (typeof name === "string") {
        if (resourceNames.has(name)) {
          errors.push(
            createError("ADL-2003", `Duplicate resource name: "${name}"`, {
              pointer: `/resources/${i}/name`,
            }),
          );
        }
        resourceNames.add(name);
      }
    }
  }

  // ADL-2004: Duplicate prompt names
  if (Array.isArray(doc.prompts)) {
    const promptNames = new Set<string>();
    for (let i = 0; i < doc.prompts.length; i++) {
      const prompt = doc.prompts[i] as Record<string, unknown>;
      const name = prompt?.name;
      if (typeof name === "string") {
        if (promptNames.has(name)) {
          errors.push(
            createError("ADL-2004", `Duplicate prompt name: "${name}"`, {
              pointer: `/prompts/${i}/name`,
            }),
          );
        }
        promptNames.add(name);
      }
    }
  }

  // ADL-5003: Lifecycle sunset_date must be after effective_date
  const lifecycle = doc.lifecycle as Record<string, unknown> | undefined;
  if (lifecycle) {
    const effectiveDate = lifecycle.effective_date as string | undefined;
    const sunsetDate = lifecycle.sunset_date as string | undefined;

    if (effectiveDate && sunsetDate) {
      const effective = new Date(effectiveDate);
      const sunset = new Date(sunsetDate);
      if (sunset <= effective) {
        errors.push(
          createError(
            "ADL-5003",
            `sunset_date (${sunsetDate}) must be after effective_date (${effectiveDate})`,
            { pointer: "/lifecycle/sunset_date" },
          ),
        );
      }
    }
  }

  return errors;
}
