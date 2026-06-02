#!/usr/bin/env python3
"""
Cut an ADL spec release: freeze versions/draft into versions/<VERSION>/ and bump
the working draft to the next minor version.

Deterministic port of the release-spec procedure (steps 1-3 and 5-8). It does
NOT generate the IETF I-D or commit -- the release workflow generates the I-D in
the publish stage (where the kramdown-rfc/xml2rfc toolchain lives) and opens the
release PR. Run with --dry-run to preview every change without touching the tree.

Usage:
  python scripts/cut_release.py 0.3.0
  python scripts/cut_release.py            # version inferred from the manifest draft label
  python scripts/cut_release.py 0.3.0 --dry-run
"""

from __future__ import annotations

import argparse
import datetime
import re
import shutil
import sys
from pathlib import Path

try:
    import yaml
except ImportError:
    print("pip install pyyaml", file=sys.stderr)
    sys.exit(2)

REPO = Path(__file__).resolve().parent.parent


def fail(msg: str) -> None:
    print(f"error: {msg}", file=sys.stderr)
    sys.exit(1)


class Editor:
    """Collects and applies literal, occurrence-checked file edits."""

    def __init__(self, dry: bool) -> None:
        self.dry = dry

    def rel(self, path: Path) -> str:
        try:
            return str(path.relative_to(REPO))
        except ValueError:
            return str(path)

    def replace(self, path: Path, old: str, new: str, *, count: int = 1,
                read_from: Path | None = None) -> None:
        src = read_from or path
        if not src.exists():
            fail(f"{self.rel(src)}: file not found")
        text = src.read_text(encoding="utf-8")
        found = text.count(old)
        if count is not None and found != count:
            fail(f"{self.rel(path)}: expected {count} occurrence(s) of {old!r}, found {found}")
        if found == 0:
            return
        print(f"  edit {self.rel(path)}: {old!r} -> {new!r}  (x{found})")
        if not self.dry:
            path.write_text(text.replace(old, new), encoding="utf-8")

    def write(self, path: Path, text: str, label: str) -> None:
        print(f"  {label} {self.rel(path)}")
        if not self.dry:
            path.write_text(text, encoding="utf-8")


def freeze_manifest(text: str, version: str, ietf: str, next_version: str,
                    next_ietf: str, old_latest: str, today: str) -> str:
    """Return manifest text with the draft released and a new draft added."""
    text = text.replace(f'latest: "{old_latest}"', f'latest: "{version}"', 1)
    text = text.replace(f'label: "{version} (Draft)"', f'label: "{next_version} (Draft)"', 1)
    text = text.replace(f'ietf_draft: "{ietf}"', f'ietf_draft: "{next_ietf}"', 1)
    # Insert the newly released entry just before the first released entry.
    new_entry = (
        f'  - id: "{version}"\n'
        f'    status: released\n'
        f'    label: "{version}"\n'
        f'    released_at: "{today}"\n'
        f'    ietf_draft: "{ietf}"\n\n'
    )
    m = re.search(r'^  - id: "\d+\.\d+\.\d+"\n', text, re.M)
    if not m:
        fail("manifest: could not find an existing released entry to anchor the insert")
    return text[: m.start()] + new_entry + text[m.start():]


def freeze_docusaurus(text: str, version: str, next_version: str, old_latest: str) -> str:
    """Return docusaurus.config.ts text with the released version added."""
    text = text.replace(f"lastVersion: '{old_latest}'", f"lastVersion: '{version}'", 1)
    text = text.replace(f"label: '{version} (Draft)'", f"label: '{next_version} (Draft)'", 1)
    # Insert a versions-map entry for the released version before the old latest.
    anchor = f"          '{old_latest}': {{"
    new_entry = (
        f"          '{version}': {{\n"
        f"            label: '{version}',\n"
        f"            banner: 'none',\n"
        f"          }},\n"
    )
    if anchor not in text:
        fail(f"docusaurus.config.ts: could not find the '{old_latest}' versions entry to anchor the insert")
    return text.replace(anchor, new_entry + anchor, 1)


def main() -> None:
    ap = argparse.ArgumentParser(description="Cut an ADL spec release (freeze + draft bump)")
    ap.add_argument("version", nargs="?", help="version to cut, e.g. 0.3.0 (default: manifest draft label)")
    ap.add_argument("--dry-run", action="store_true", help="preview without modifying anything")
    ap.add_argument("--date", help="release date YYYY-MM-DD (default: today)")
    args = ap.parse_args()
    ed = Editor(args.dry_run)

    manifest_path = REPO / "versions" / "manifest.yaml"
    manifest = yaml.safe_load(manifest_path.read_text(encoding="utf-8"))
    draft_entry = next((v for v in manifest["versions"] if v["id"] == "draft"), None)
    if not draft_entry:
        fail("manifest has no draft entry")

    # Step 1 -- derive metadata
    version = args.version or draft_entry["label"].split()[0]
    m = re.fullmatch(r"(\d+)\.(\d+)\.(\d+)", version)
    if not m:
        fail(f"invalid version {version!r} (expected MAJOR.MINOR.PATCH)")
    major, minor, _ = (int(x) for x in m.groups())
    ietf = f"draft-nederveld-adl-{minor:02d}"
    next_version = f"{major}.{minor + 1}.0"
    next_ietf = f"draft-nederveld-adl-{minor + 1:02d}"
    old_latest = manifest["latest"]
    today = args.date or datetime.date.today().isoformat()

    frozen = REPO / "versions" / version
    if frozen.exists():
        fail(f"versions/{version}/ already exists -- {version} is already released")

    print(f"Cutting {version} (IETF {ietf}); bumping draft to {next_version} "
          f"({next_ietf}); released_at {today}{' [dry-run]' if args.dry_run else ''}\n")

    draft_dir = REPO / "versions" / "draft"
    draft_spec = draft_dir / "spec.md"

    # Step 2 -- freeze
    print(f"  freeze versions/draft -> versions/{version}")
    if not args.dry_run:
        shutil.copytree(draft_dir, frozen)

    # Step 3 -- finalize the frozen header (validate against the draft when dry).
    frozen_spec = frozen / "spec.md"
    read_from = None if not args.dry_run else draft_spec
    ed.replace(frozen_spec, f"**Version:** {version}-draft", f"**Version:** {version}",
               read_from=read_from)
    ed.replace(frozen_spec, "**Status:** Draft", "**Status:** Posted", read_from=read_from)

    # Step 5 -- bump the working draft to the next version
    ed.replace(draft_spec, f"**Version:** {version}-draft", f"**Version:** {next_version}-draft")
    ed.replace(draft_spec, f"ADL v{version} specification", f"ADL v{next_version} specification")
    for ex in sorted((draft_dir / "examples").glob("*.yaml")):
        ed.replace(ex, f'adl_spec: "{version}"', f'adl_spec: "{next_version}"', count=None)
    ed.replace(draft_dir / "examples" / "index.md",
               f'adl_spec: "{version}"', f'adl_spec: "{next_version}"', count=None)

    # Step 6 -- manifest
    new_manifest = freeze_manifest(manifest_path.read_text(encoding="utf-8"),
                                   version, ietf, next_version, next_ietf, old_latest, today)
    ed.write(manifest_path, new_manifest, "rewrite")

    # Step 7 -- docusaurus config
    dcfg = REPO / "site" / "docusaurus.config.ts"
    ed.write(dcfg, freeze_docusaurus(dcfg.read_text(encoding="utf-8"), version, next_version, old_latest),
             "rewrite")

    # Step 8 -- bump generator + boilerplate docname for the next draft
    ed.replace(REPO / "scripts" / "generate_ietf.py", f'"{ietf}.md"', f'"{next_ietf}.md"')
    ed.replace(REPO / "standardization" / "templates" / "ietf-boilerplate.md",
               f"docname: {ietf}", f"docname: {next_ietf}")

    print(f"\nDone. Frozen versions/{version}/; draft now {next_version}. "
          f"The release workflow generates the I-D (docname {ietf}) and opens the release PR.")


if __name__ == "__main__":
    main()
