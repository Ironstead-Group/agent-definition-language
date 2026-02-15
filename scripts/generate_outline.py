#!/usr/bin/env python3
"""
Generate a section outline from the ADL spec manifest.
Used to produce body-specific TOCs or to drive full RFC/ISO document generation.

Usage:
  python scripts/generate_outline.py                    # flat outline -> spec-outline.txt
  python scripts/generate_outline.py --format rfc      # RFC-style numbered TOC
  python scripts/generate_outline.py --format json     # JSON outline for other tools
"""

import argparse
import json
import os
import sys
from pathlib import Path

try:
    import yaml
except ImportError:
    print("pip install pyyaml", file=sys.stderr)
    sys.exit(1)


REPO_ROOT = Path(__file__).resolve().parent.parent
MANIFEST_PATH = REPO_ROOT / "versions" / "0.1.0-draft" / "spec-manifest.yaml"
OUTPUT_DIR = REPO_ROOT / "standardization" / "output"


def load_manifest(path: Path) -> dict:
    with open(path, encoding="utf-8") as f:
        return yaml.safe_load(f)


def flatten_sections(sections: list, prefix: str = "") -> list:
    """Flatten manifest sections into (number, title, id) list."""
    out = []
    for s in sections:
        num = s.get("number", "")
        title = s.get("title", "")
        sid = s.get("id", "")
        out.append((f"{prefix}{num}".strip(), title, sid))
        for sub in s.get("subsections", []) or []:
            out.extend(flatten_sections([sub], prefix=prefix))
    return out


def emit_flat(out_path: Path, flat: list) -> None:
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        for num, title, sid in flat:
            f.write(f"{num}\t{title}\t{sid}\n")


def emit_rfc_toc(flat: list) -> str:
    """RFC-style table of contents lines."""
    lines = []
    for num, title, sid in flat:
        lines.append(f"   {num}.  {title}")
    return "\n".join(lines)


def emit_json(flat: list) -> str:
    arr = [{"number": n, "title": t, "id": i} for n, t, i in flat]
    return json.dumps(arr, indent=2)


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate outline from ADL spec manifest")
    parser.add_argument("--manifest", type=Path, default=MANIFEST_PATH, help="Path to spec-manifest.yaml")
    parser.add_argument("--format", choices=("flat", "rfc", "json"), default="flat", help="Output format")
    parser.add_argument("--output", type=Path, help="Output file (default: stdout for rfc/json, else standardization/output/spec-outline.txt)")
    args = parser.parse_args()

    manifest = load_manifest(args.manifest)
    sections = manifest.get("sections", [])
    flat = flatten_sections(sections)

    if args.format == "flat":
        out_path = args.output or OUTPUT_DIR / "spec-outline.txt"
        emit_flat(out_path, flat)
        print(f"Wrote {out_path}", file=sys.stderr)
    elif args.format == "rfc":
        toc = emit_rfc_toc(flat)
        if args.output:
            args.output.parent.mkdir(parents=True, exist_ok=True)
            args.output.write_text(toc, encoding="utf-8")
            print(f"Wrote {args.output}", file=sys.stderr)
        else:
            print(toc)
    elif args.format == "json":
        js = emit_json(flat)
        if args.output:
            args.output.parent.mkdir(parents=True, exist_ok=True)
            args.output.write_text(js, encoding="utf-8")
            print(f"Wrote {args.output}", file=sys.stderr)
        else:
            print(js)


if __name__ == "__main__":
    main()
