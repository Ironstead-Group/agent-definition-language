"""Schema validation for ADL passports.

Loads the canonical JSON Schema from ``versions/0.2.0/schema.json`` and
validates passports against it. The §1.1.2 step in the verification
procedure runs *strict schema-only* validation — semantic checks like
attestation expiry are handled by §1.1.6, not here.

This is the clean separation that lets the Python and TypeScript ports
share the same conformance vector pack.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Optional

from jsonschema import Draft202012Validator, ValidationError


@dataclass
class SchemaError:
    code: str
    detail: str
    pointer: str


@dataclass
class ValidationResult:
    valid: bool
    errors: list[SchemaError]


_SCHEMA_CACHE: dict[str, dict[str, Any]] = {}


def _find_schema_path(version: str) -> Path:
    """Locate ``versions/{version}/schema.json`` relative to this package.

    Walks up from this file's directory looking for a ``versions/``
    sibling. This works in dev (workspace) layouts; production wheels
    would bundle the schema as package data.
    """
    here = Path(__file__).resolve()
    for parent in here.parents:
        candidate = parent / "versions" / version / "schema.json"
        if candidate.is_file():
            return candidate
    raise FileNotFoundError(
        f"Could not find versions/{version}/schema.json relative to {here}"
    )


def _load_schema(version: str) -> dict[str, Any]:
    if version not in _SCHEMA_CACHE:
        path = _find_schema_path(version)
        _SCHEMA_CACHE[version] = json.loads(path.read_text())
    return _SCHEMA_CACHE[version]


def validate_document(document: dict[str, Any]) -> ValidationResult:
    """Validate a passport against the schema declared by its ``adl_spec`` field.

    Pure structural validation — does NOT enforce attestation expiry or
    other semantic rules. Those are enforced at later steps in the
    verification procedure.
    """
    spec = document.get("adl_spec", "0.2.0")
    schema = _load_schema(spec)

    validator = Draft202012Validator(schema)
    errors: list[SchemaError] = []
    for err in sorted(validator.iter_errors(document), key=lambda e: list(e.absolute_path)):
        errors.append(_translate_error(err))

    return ValidationResult(valid=len(errors) == 0, errors=errors)


def _translate_error(err: ValidationError) -> SchemaError:
    """Translate a jsonschema error to an ADL-style error code.

    The conformance vector pack only asserts pass/fail at the §1.1.2
    step, not specific error codes — so any reasonable mapping works.
    Rough mapping of validator name to ADL error code family:
        required → ADL-1001 (missing required member)
        type     → ADL-1002 (wrong type)
        enum     → ADL-2012 (invalid enum value)
        pattern  → ADL-2013 (pattern mismatch)
        format   → ADL-2014 (format violation)
        anything else → ADL-1099 (generic schema violation)
    """
    code_map = {
        "required": "ADL-1001",
        "type": "ADL-1002",
        "enum": "ADL-2012",
        "pattern": "ADL-2013",
        "format": "ADL-2014",
    }
    code = code_map.get(err.validator or "", "ADL-1099")
    pointer = "/" + "/".join(str(p) for p in err.absolute_path)
    return SchemaError(code=code, detail=err.message, pointer=pointer)
