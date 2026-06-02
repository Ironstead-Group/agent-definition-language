"""Parse ADL passports from JSON or YAML."""

from __future__ import annotations

import json
from typing import Any, Literal, Optional

import yaml

ParseFormat = Literal["json", "yaml", "auto"]


def parse_adl(
    content: str | bytes, fmt: ParseFormat = "auto"
) -> tuple[Optional[dict[str, Any]], list[str]]:
    """Parse a passport string into a dict.

    Returns ``(document, errors)``. If parsing fails, ``document`` is
    ``None`` and ``errors`` lists the failure reasons.
    """
    if isinstance(content, bytes):
        content = content.decode("utf-8")

    chosen = fmt
    if chosen == "auto":
        chosen = "json" if content.lstrip().startswith("{") else "yaml"

    try:
        if chosen == "json":
            doc = json.loads(content)
        else:
            doc = yaml.safe_load(content)
    except (json.JSONDecodeError, yaml.YAMLError) as e:
        return None, [f"parse failed ({chosen}): {e}"]

    if not isinstance(doc, dict):
        return None, ["passport must be a JSON object / YAML mapping"]

    return doc, []
