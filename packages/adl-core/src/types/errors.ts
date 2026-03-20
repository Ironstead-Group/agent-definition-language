/**
 * ADL error types and catalog per spec Section 16.2
 */

export interface ADLErrorSource {
  pointer?: string;
  line?: number;
  column?: number;
}

export interface ADLError {
  code: string;
  title: string;
  detail: string;
  source?: ADLErrorSource;
}

export interface ADLErrorReport {
  errors: ADLError[];
}

export const ADL_ERRORS: Record<
  string,
  { category: string; description: string }
> = {
  // Parse errors
  "ADL-1001": { category: "Parse", description: "Invalid JSON syntax" },
  "ADL-1002": {
    category: "Parse",
    description: "Document is not a JSON object",
  },
  "ADL-1003": { category: "Schema", description: "Missing required member" },
  "ADL-1004": { category: "Schema", description: "Invalid member type" },
  "ADL-1005": { category: "Schema", description: "Invalid enum value" },
  "ADL-1006": {
    category: "Schema",
    description: "Value does not match pattern",
  },

  // Semantic errors
  "ADL-2001": { category: "Semantic", description: "Unsupported ADL version" },
  "ADL-2002": { category: "Semantic", description: "Duplicate tool name" },
  "ADL-2003": { category: "Semantic", description: "Duplicate resource name" },
  "ADL-2004": { category: "Semantic", description: "Duplicate prompt name" },
  "ADL-2005": {
    category: "Semantic",
    description: "Invalid timestamp format",
  },
  "ADL-2006": { category: "Semantic", description: "Invalid URI format" },
  "ADL-2007": { category: "Semantic", description: "Invalid JSON Schema" },
  "ADL-2008": {
    category: "Semantic",
    description: "Invalid tool name pattern",
  },
  "ADL-2009": {
    category: "Semantic",
    description: "Invalid resource type value",
  },
  "ADL-2010": {
    category: "Semantic",
    description: "Temperature out of range",
  },
  "ADL-2011": {
    category: "Semantic",
    description: "Invalid authentication type",
  },
  "ADL-2012": {
    category: "Semantic",
    description: "Invalid attestation type",
  },
  "ADL-2013": {
    category: "Semantic",
    description: "Invalid error handling action",
  },
  "ADL-2014": { category: "Semantic", description: "Invalid output format" },
  "ADL-2015": {
    category: "Semantic",
    description: "Invalid model capability",
  },
  "ADL-2016": {
    category: "Semantic",
    description: "Invalid host pattern syntax",
  },
  "ADL-2017": {
    category: "Semantic",
    description: "Invalid filesystem path pattern",
  },
  "ADL-2018": {
    category: "Semantic",
    description: "Invalid environment variable pattern",
  },
  "ADL-2019": {
    category: "Semantic",
    description: "Missing digest fields for digest-mode signature",
  },
  "ADL-2020": {
    category: "Semantic",
    description: "Invalid data classification sensitivity",
  },
  "ADL-2021": {
    category: "Semantic",
    description: "Invalid data classification category",
  },
  "ADL-2022": {
    category: "Semantic",
    description: "Retention min_days exceeds max_days",
  },
  "ADL-2023": {
    category: "Semantic",
    description: "High-water mark violation",
  },

  // Profile errors
  "ADL-3001": {
    category: "Profile",
    description: "Profile requirements not satisfied",
  },
  "ADL-3002": { category: "Profile", description: "Unknown profile" },

  // Security errors
  "ADL-4001": { category: "Security", description: "Weak key algorithm" },
  "ADL-4002": { category: "Security", description: "Invalid signature" },
  "ADL-4003": { category: "Security", description: "Expired attestation" },

  // Lifecycle errors
  "ADL-5001": {
    category: "Lifecycle",
    description: "Invalid lifecycle status value",
  },
  "ADL-5002": {
    category: "Lifecycle",
    description: "Successor present on active/draft agent",
  },
  "ADL-5003": {
    category: "Lifecycle",
    description: "Sunset date in the past with non-retired status",
  },
};

export function createError(
  code: string,
  detail: string,
  source?: ADLErrorSource,
): ADLError {
  const info = ADL_ERRORS[code];
  return {
    code,
    title: info?.description ?? "Unknown error",
    detail,
    source,
  };
}

export function formatErrorsJSON(errors: ADLError[]): string {
  return JSON.stringify({ errors }, null, 2);
}
