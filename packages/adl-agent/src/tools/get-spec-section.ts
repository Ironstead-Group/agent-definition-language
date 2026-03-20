/**
 * Tool: get_spec_section — retrieve information about ADL spec sections.
 */

import { concepts } from "../knowledge/concepts.js";

export interface GetSpecSectionInput {
  section: string;
}

export interface GetSpecSectionResult {
  found: boolean;
  section: string;
  title?: string;
  content?: string;
  related_concepts?: string[];
}

/**
 * Mapping from spec section keywords to structured section information.
 */
const specSections: Record<
  string,
  { title: string; content: string; related_concepts: string[] }
> = {
  overview: {
    title: "ADL Overview",
    content:
      "The Agent Definition Language (ADL) is a structured format for describing AI agents. " +
      "An ADL document — called a passport — declares an agent's identity, capabilities, " +
      "permissions, security posture, and trust signals in a portable, machine-readable format. " +
      "ADL uses YAML or JSON and is validated against a JSON Schema.",
    related_concepts: ["passport_model", "data_classification", "lifecycle"],
  },

  required_fields: {
    title: "Required Fields",
    content:
      "Every ADL document must include: `adl_spec` (version string like '0.2.0'), `name` " +
      "(human-readable agent name), `description` (what the agent does), `version` (semver " +
      "string), and `data_classification` (with at least a `sensitivity` level).",
    related_concepts: ["passport_model", "data_classification"],
  },

  tools: {
    title: "Tools Section (Section 9)",
    content:
      "The `tools` array defines actions the agent can perform. Each tool requires `name` and " +
      "`description`. Optional fields: `parameters` (JSON Schema), `returns` (JSON Schema), " +
      "`examples`, `requires_confirmation`, `idempotent`, `read_only`, `annotations`, and " +
      "`data_classification`. Tool names must be unique and match `[a-z][a-z0-9_]*`.",
    related_concepts: ["tools"],
  },

  permissions: {
    title: "Permissions Section (Section 12)",
    content:
      "The `permissions` section uses deny-by-default. Sub-fields: `network` (hosts, ports, " +
      "protocols, deny_private), `filesystem` (paths with access levels), `environment` " +
      "(allowed/denied variables), `execution` (commands, shell access), and `resource_limits` " +
      "(memory, CPU, duration, concurrency).",
    related_concepts: ["permissions"],
  },

  security: {
    title: "Security Section (Section 13)",
    content:
      "The `security` section covers `authentication` (type, scopes, endpoints), `encryption` " +
      "(in-transit TLS, at-rest algorithms), and `attestation` (self or third-party trust " +
      "signals with optional cryptographic signatures).",
    related_concepts: ["security"],
  },

  data_classification: {
    title: "Data Classification (Section 5)",
    content:
      "Required on every document. `sensitivity`: public, internal, confidential, restricted " +
      "(based on NIST FIPS 199). `categories`: PII, PHI, financial, etc. `retention`: min/max " +
      "days and policy URI. `handling`: encryption, anonymization, cross-border, logging flags. " +
      "High-water mark: tool sensitivity >= document sensitivity.",
    related_concepts: ["data_classification"],
  },

  model: {
    title: "Model Configuration (Section 8)",
    content:
      "The `model` section describes the AI model: `provider` (e.g., anthropic, openai), " +
      "`name` (model identifier), `version`, `context_window`, `temperature` (0.0-2.0), " +
      "`max_tokens`, and `capabilities` (function_calling, vision, streaming, embeddings, etc.).",
    related_concepts: ["system_prompt"],
  },

  lifecycle: {
    title: "Lifecycle (Section 6)",
    content:
      "Tracks agent lifecycle: `status` (draft, active, deprecated, retired), `effective_date` " +
      "(ISO 8601), `sunset_date` (must be after effective_date), and `successor` (only valid " +
      "on deprecated/retired agents).",
    related_concepts: ["lifecycle"],
  },

  profiles: {
    title: "Profiles (Section 15)",
    content:
      "Profiles are domain-specific extensions that compose the base schema via JSON Schema " +
      "`allOf`. Declared in the `profiles` array. Each profile has its own schema that adds " +
      "required fields and conditional validation rules. Profiles can tighten but never loosen " +
      "constraints from the base schema or parent profiles.",
    related_concepts: ["profiles"],
  },

  extensions: {
    title: "Extensions (Section 16)",
    content:
      "The `extensions` field uses reverse-domain-name keys (e.g., `com.acme.feature`). " +
      "Available at nearly every level. Must not alter standard field semantics. Preserved " +
      "during validation and conversion but not guaranteed to be understood by all consumers.",
    related_concepts: ["extensions"],
  },

  runtime: {
    title: "Runtime Configuration (Section 14)",
    content:
      "The `runtime` section configures: `input_handling` (max length, content types, " +
      "sanitization), `output_handling` (max length, format, streaming), `tool_invocation` " +
      "(parallel execution, concurrency, timeouts, retry policies), and `error_handling` " +
      "(on_tool_error action, retries, fallback behavior).",
    related_concepts: ["tools"],
  },

  converters: {
    title: "Format Converters",
    content:
      "ADL provides built-in converters: `convertToA2A()` produces A2A Agent Cards (tools " +
      "become skills, provider/auth mapped). `convertToMCP()` produces MCP Server Configs " +
      "(tools, resources, prompts mapped to MCP equivalents). These enable interoperability " +
      "without maintaining separate format descriptions.",
    related_concepts: ["converters"],
  },
};

/**
 * Look up a spec section by keyword.
 */
export function getSpecSection(
  input: GetSpecSectionInput,
): GetSpecSectionResult {
  const key = normalizeKey(input.section);

  // Direct match
  if (specSections[key]) {
    const section = specSections[key];
    return {
      found: true,
      section: key,
      title: section.title,
      content: section.content,
      related_concepts: section.related_concepts,
    };
  }

  // Fuzzy match
  const match = Object.entries(specSections).find(([k, v]) => {
    const lower = input.section.toLowerCase();
    return (
      k.includes(lower) ||
      lower.includes(k) ||
      v.title.toLowerCase().includes(lower)
    );
  });

  if (match) {
    return {
      found: true,
      section: match[0],
      title: match[1].title,
      content: match[1].content,
      related_concepts: match[1].related_concepts,
    };
  }

  // Try matching against concept keys as fallback
  const conceptKey = normalizeKey(input.section);
  if (concepts[conceptKey]) {
    const concept = concepts[conceptKey];
    return {
      found: true,
      section: conceptKey,
      title: concept.title,
      content: concept.details,
      related_concepts: [conceptKey],
    };
  }

  return {
    found: false,
    section: input.section,
    related_concepts: Object.keys(specSections),
  };
}

function normalizeKey(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[\s-]+/g, "_")
    .replace(/[()]/g, "")
    .replace(/^section_\d+[_:]?\s*/i, "");
}
