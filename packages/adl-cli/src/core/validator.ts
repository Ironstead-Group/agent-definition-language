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

  // ADL-2020/2021/2022: Data classification checks
  const dataClassification = doc.data_classification as Record<string, unknown> | undefined;
  if (dataClassification) {
    const VALID_SENSITIVITIES = ["public", "internal", "confidential", "restricted"];
    const VALID_CATEGORIES = ["pii", "phi", "financial", "credentials", "intellectual_property", "regulatory"];

    // ADL-2020: Invalid sensitivity level
    if (typeof dataClassification.sensitivity === "string" && !VALID_SENSITIVITIES.includes(dataClassification.sensitivity)) {
      errors.push(
        createError(
          "ADL-2020",
          `Invalid data classification sensitivity: "${dataClassification.sensitivity}". Valid: ${VALID_SENSITIVITIES.join(", ")}`,
          { pointer: "/data_classification/sensitivity" },
        ),
      );
    }

    // ADL-2021: Invalid category values
    if (Array.isArray(dataClassification.categories)) {
      for (let i = 0; i < dataClassification.categories.length; i++) {
        const cat = dataClassification.categories[i] as string;
        if (typeof cat === "string" && !VALID_CATEGORIES.includes(cat)) {
          errors.push(
            createError(
              "ADL-2021",
              `Invalid data classification category: "${cat}". Valid: ${VALID_CATEGORIES.join(", ")}`,
              { pointer: `/data_classification/categories/${i}` },
            ),
          );
        }
      }
    }

    // ADL-2022: Retention min_days exceeds max_days
    const retention = dataClassification.retention as Record<string, unknown> | undefined;
    if (retention) {
      const minDays = retention.min_days as number | undefined;
      const maxDays = retention.max_days as number | undefined;
      if (typeof minDays === "number" && typeof maxDays === "number" && minDays > maxDays) {
        errors.push(
          createError(
            "ADL-2022",
            `Retention min_days (${minDays}) exceeds max_days (${maxDays})`,
            { pointer: "/data_classification/retention" },
          ),
        );
      }
    }
  }

  // ADL-2023: High-water mark — top-level sensitivity must be >= any tool/resource sensitivity
  if (dataClassification && typeof dataClassification.sensitivity === "string") {
    const SENSITIVITY_ORDER: Record<string, number> = {
      public: 0,
      internal: 1,
      confidential: 2,
      restricted: 3,
    };
    const topLevel = SENSITIVITY_ORDER[dataClassification.sensitivity] ?? -1;

    const checkItems = (items: unknown[], kind: string) => {
      if (!Array.isArray(items)) return;
      for (let i = 0; i < items.length; i++) {
        const item = items[i] as Record<string, unknown>;
        const itemDc = item?.data_classification as Record<string, unknown> | undefined;
        if (itemDc && typeof itemDc.sensitivity === "string") {
          const itemLevel = SENSITIVITY_ORDER[itemDc.sensitivity] ?? -1;
          if (itemLevel > topLevel) {
            errors.push(
              createError(
                "ADL-2023",
                `${kind}[${i}] sensitivity "${itemDc.sensitivity}" exceeds top-level sensitivity "${dataClassification.sensitivity}" (high-water mark violation)`,
                { pointer: `/${kind}/${i}/data_classification/sensitivity` },
              ),
            );
          }
        }
      }
    };

    checkItems(doc.tools as unknown[] ?? [], "tools");
    checkItems(doc.resources as unknown[] ?? [], "resources");
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
