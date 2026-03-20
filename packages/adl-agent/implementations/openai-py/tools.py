"""
Tool implementations for the ADL Explainer Agent.

Provides five tools: explain_concept, validate_document, show_example,
get_spec_section, and compare_formats. Knowledge is loaded from shared
JSON files in the knowledge/ directory.
"""

from __future__ import annotations

import json
import os
import re
from pathlib import Path
from typing import Any

import yaml

# ---------------------------------------------------------------------------
# Knowledge loading
# ---------------------------------------------------------------------------

_KNOWLEDGE_DIR = Path(__file__).resolve().parent / ".." / ".." / "knowledge"

with open(_KNOWLEDGE_DIR / "concepts.json", encoding="utf-8") as _f:
    CONCEPTS: dict[str, dict[str, str]] = json.load(_f)

with open(_KNOWLEDGE_DIR / "comparisons.json", encoding="utf-8") as _f:
    COMPARISONS: dict[str, dict[str, str]] = json.load(_f)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _normalize_key(value: str) -> str:
    """Lowercase, strip, and replace spaces/hyphens with underscores."""
    return re.sub(r"[\s-]+", "_", value.lower().strip())


def _find_examples_dir() -> Path:
    """Walk up from this file to find the repo root (where versions/ lives)."""
    directory = Path(__file__).resolve().parent
    while directory != directory.parent:
        candidate = directory / "versions"
        if candidate.is_dir():
            return candidate / "0.2.0" / "examples"
        directory = directory.parent
    return Path("versions") / "0.2.0" / "examples"


# ---------------------------------------------------------------------------
# Tool 1: explain_concept
# ---------------------------------------------------------------------------

def explain_concept(concept: str) -> dict[str, Any]:
    """Look up an ADL concept from the knowledge base."""
    key = _normalize_key(concept)

    # Direct key match
    if key in CONCEPTS:
        return {"found": True, "concept": key, "entry": CONCEPTS[key]}

    # Fuzzy match against keys and titles
    lower = concept.lower()
    for k, v in CONCEPTS.items():
        if (
            lower in k
            or lower in v["title"].lower()
            or k.replace("_", " ") in lower
        ):
            return {"found": True, "concept": k, "entry": v}

    return {
        "found": False,
        "concept": concept,
        "available_concepts": list(CONCEPTS.keys()),
    }


# ---------------------------------------------------------------------------
# Tool 2: validate_document
# ---------------------------------------------------------------------------

_REQUIRED_FIELDS = ["adl_spec", "name", "description", "version", "data_classification"]


def validate_document(document: str) -> dict[str, Any]:
    """Parse YAML/JSON and perform basic structural validation."""
    # Try to parse
    try:
        parsed = yaml.safe_load(document)
    except yaml.YAMLError as exc:
        return {
            "valid": False,
            "errors": [{"field": "document", "message": f"YAML/JSON parse error: {exc}"}],
            "summary": "Document could not be parsed.",
        }

    if parsed is None:
        return {
            "valid": False,
            "errors": [{"field": "document", "message": "Document is empty."}],
            "summary": "Document is empty.",
        }

    if not isinstance(parsed, dict):
        return {
            "valid": False,
            "errors": [
                {
                    "field": "document",
                    "message": "Document root must be a mapping/object, not "
                    + type(parsed).__name__,
                }
            ],
            "summary": "Document root is not a mapping.",
        }

    # Check required fields
    errors: list[dict[str, str]] = []
    for field in _REQUIRED_FIELDS:
        if field not in parsed:
            errors.append({
                "field": field,
                "message": f"Required field '{field}' is missing.",
            })

    # Validate data_classification structure
    dc = parsed.get("data_classification")
    if isinstance(dc, dict):
        if "sensitivity" not in dc:
            errors.append({
                "field": "data_classification.sensitivity",
                "message": "data_classification must include a 'sensitivity' field.",
            })
        elif dc["sensitivity"] not in ("public", "internal", "confidential", "restricted"):
            errors.append({
                "field": "data_classification.sensitivity",
                "message": (
                    f"Invalid sensitivity '{dc['sensitivity']}'. "
                    "Must be one of: public, internal, confidential, restricted."
                ),
            })
    elif dc is not None:
        errors.append({
            "field": "data_classification",
            "message": "data_classification must be a mapping with at least a 'sensitivity' field.",
        })

    if errors:
        return {
            "valid": False,
            "errors": errors,
            "summary": f"Document has {len(errors)} validation error(s).",
        }

    return {
        "valid": True,
        "errors": [],
        "summary": "Document is valid ADL.",
    }


# ---------------------------------------------------------------------------
# Tool 3: show_example
# ---------------------------------------------------------------------------

_EXAMPLE_MAP: dict[str, str] = {
    "minimal": "minimal.yaml",
    "production": "production.yaml",
    "with-tools": "with-tools.yaml",
}


def show_example(category: str) -> dict[str, Any]:
    """Load and return an example ADL document by category."""
    filename = _EXAMPLE_MAP.get(category)
    if not filename:
        return {
            "found": False,
            "category": category,
            "available_categories": list(_EXAMPLE_MAP.keys()),
        }

    examples_dir = _find_examples_dir()
    file_path = examples_dir / filename

    if not file_path.is_file():
        return {
            "found": False,
            "category": category,
            "available_categories": list(_EXAMPLE_MAP.keys()),
        }

    content = file_path.read_text(encoding="utf-8")
    return {
        "found": True,
        "category": category,
        "content": content,
        "filename": filename,
    }


# ---------------------------------------------------------------------------
# Tool 4: get_spec_section
# ---------------------------------------------------------------------------

_SPEC_SECTIONS: dict[str, dict[str, Any]] = {
    "overview": {
        "title": "ADL Overview",
        "content": (
            "The Agent Definition Language (ADL) is a structured format for describing AI agents. "
            "An ADL document -- called a passport -- declares an agent's identity, capabilities, "
            "permissions, security posture, and trust signals in a portable, machine-readable format. "
            "ADL uses YAML or JSON and is validated against a JSON Schema."
        ),
        "related_concepts": ["passport_model", "data_classification", "lifecycle"],
    },
    "required_fields": {
        "title": "Required Fields",
        "content": (
            "Every ADL document must include: `adl_spec` (version string like '0.2.0'), `name` "
            "(human-readable agent name), `description` (what the agent does), `version` (semver "
            "string), and `data_classification` (with at least a `sensitivity` level)."
        ),
        "related_concepts": ["passport_model", "data_classification"],
    },
    "tools": {
        "title": "Tools Section (Section 9)",
        "content": (
            "The `tools` array defines actions the agent can perform. Each tool requires `name` and "
            "`description`. Optional fields: `parameters` (JSON Schema), `returns` (JSON Schema), "
            "`examples`, `requires_confirmation`, `idempotent`, `read_only`, `annotations`, and "
            "`data_classification`. Tool names must be unique and match `[a-z][a-z0-9_]*`."
        ),
        "related_concepts": ["tools"],
    },
    "permissions": {
        "title": "Permissions Section (Section 12)",
        "content": (
            "The `permissions` section uses deny-by-default. Sub-fields: `network` (hosts, ports, "
            "protocols, deny_private), `filesystem` (paths with access levels), `environment` "
            "(allowed/denied variables), `execution` (commands, shell access), and `resource_limits` "
            "(memory, CPU, duration, concurrency)."
        ),
        "related_concepts": ["permissions"],
    },
    "security": {
        "title": "Security Section (Section 13)",
        "content": (
            "The `security` section covers `authentication` (type, scopes, endpoints), `encryption` "
            "(in-transit TLS, at-rest algorithms), and `attestation` (self or third-party trust "
            "signals with optional cryptographic signatures)."
        ),
        "related_concepts": ["security"],
    },
    "data_classification": {
        "title": "Data Classification (Section 5)",
        "content": (
            "Required on every document. `sensitivity`: public, internal, confidential, restricted "
            "(based on NIST FIPS 199). `categories`: PII, PHI, financial, etc. `retention`: min/max "
            "days and policy URI. `handling`: encryption, anonymization, cross-border, logging flags. "
            "High-water mark: tool sensitivity >= document sensitivity."
        ),
        "related_concepts": ["data_classification"],
    },
    "model": {
        "title": "Model Configuration (Section 8)",
        "content": (
            "The `model` section describes the AI model: `provider` (e.g., anthropic, openai), "
            "`name` (model identifier), `version`, `context_window`, `temperature` (0.0-2.0), "
            "`max_tokens`, and `capabilities` (function_calling, vision, streaming, embeddings, etc.)."
        ),
        "related_concepts": ["system_prompt"],
    },
    "lifecycle": {
        "title": "Lifecycle (Section 6)",
        "content": (
            "Tracks agent lifecycle: `status` (draft, active, deprecated, retired), `effective_date` "
            "(ISO 8601), `sunset_date` (must be after effective_date), and `successor` (only valid "
            "on deprecated/retired agents)."
        ),
        "related_concepts": ["lifecycle"],
    },
    "profiles": {
        "title": "Profiles (Section 15)",
        "content": (
            "Profiles are domain-specific extensions that compose the base schema via JSON Schema "
            "`allOf`. Declared in the `profiles` array. Each profile has its own schema that adds "
            "required fields and conditional validation rules. Profiles can tighten but never loosen "
            "constraints from the base schema or parent profiles."
        ),
        "related_concepts": ["profiles"],
    },
    "extensions": {
        "title": "Extensions (Section 16)",
        "content": (
            "The `extensions` field uses reverse-domain-name keys (e.g., `com.acme.feature`). "
            "Available at nearly every level. Must not alter standard field semantics. Preserved "
            "during validation and conversion but not guaranteed to be understood by all consumers."
        ),
        "related_concepts": ["extensions"],
    },
    "runtime": {
        "title": "Runtime Configuration (Section 14)",
        "content": (
            "The `runtime` section configures: `input_handling` (max length, content types, "
            "sanitization), `output_handling` (max length, format, streaming), `tool_invocation` "
            "(parallel execution, concurrency, timeouts, retry policies), and `error_handling` "
            "(on_tool_error action, retries, fallback behavior)."
        ),
        "related_concepts": ["tools"],
    },
    "converters": {
        "title": "Format Converters",
        "content": (
            "ADL provides built-in converters: `convertToA2A()` produces A2A Agent Cards (tools "
            "become skills, provider/auth mapped). `convertToMCP()` produces MCP Server Configs "
            "(tools, resources, prompts mapped to MCP equivalents). These enable interoperability "
            "without maintaining separate format descriptions."
        ),
        "related_concepts": ["converters"],
    },
}


def get_spec_section(section: str) -> dict[str, Any]:
    """Look up a spec section by keyword."""
    key = _normalize_section_key(section)

    # Direct match
    if key in _SPEC_SECTIONS:
        entry = _SPEC_SECTIONS[key]
        return {
            "found": True,
            "section": key,
            "title": entry["title"],
            "content": entry["content"],
            "related_concepts": entry["related_concepts"],
        }

    # Fuzzy match
    lower = section.lower()
    for k, v in _SPEC_SECTIONS.items():
        if lower in k or k in lower or lower in v["title"].lower():
            return {
                "found": True,
                "section": k,
                "title": v["title"],
                "content": v["content"],
                "related_concepts": v["related_concepts"],
            }

    # Fallback: check concepts
    concept_key = _normalize_key(section)
    if concept_key in CONCEPTS:
        entry = CONCEPTS[concept_key]
        return {
            "found": True,
            "section": concept_key,
            "title": entry["title"],
            "content": entry["details"],
            "related_concepts": [concept_key],
        }

    return {
        "found": False,
        "section": section,
        "related_concepts": list(_SPEC_SECTIONS.keys()),
    }


def _normalize_section_key(value: str) -> str:
    """Normalize a section key, stripping 'section N' prefixes."""
    key = _normalize_key(value)
    key = re.sub(r"^section_\d+[_:]?\s*", "", key)
    key = re.sub(r"[()]", "", key)
    return key


# ---------------------------------------------------------------------------
# Tool 5: compare_formats
# ---------------------------------------------------------------------------

def compare_formats(format_name: str) -> dict[str, Any]:
    """Compare ADL with another agent description format."""
    key = _normalize_key(format_name)

    if key in COMPARISONS:
        return {"found": True, "format_key": key, "comparison": COMPARISONS[key]}

    # Fuzzy match
    lower = format_name.lower()
    for k, v in COMPARISONS.items():
        if lower in k or k in lower or lower in v["format"].lower():
            return {"found": True, "format_key": k, "comparison": v}

    return {
        "found": False,
        "format_key": format_name,
        "available_formats": list(COMPARISONS.keys()),
    }


# ---------------------------------------------------------------------------
# Dispatcher
# ---------------------------------------------------------------------------

TOOL_HANDLERS: dict[str, Any] = {
    "explain_concept": lambda args: explain_concept(args["concept"]),
    "validate_document": lambda args: validate_document(args["document"]),
    "show_example": lambda args: show_example(args["category"]),
    "get_spec_section": lambda args: get_spec_section(args["section"]),
    "compare_formats": lambda args: compare_formats(args["format"]),
}


def execute_tool(name: str, arguments: dict[str, Any]) -> str:
    """Execute a tool by name and return the result as a JSON string."""
    handler = TOOL_HANDLERS.get(name)
    if handler is None:
        return json.dumps({"error": f"Unknown tool: {name}"})
    return json.dumps(handler(arguments))
