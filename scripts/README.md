# Spec generation scripts

This directory holds **programmatic tooling** to generate standards-body-specific output from the single ADL spec source.

## Goal

- **Single source:** `versions/0.1.0-draft/spec.md` (human-readable spec) + `versions/0.1.0-draft/spec-manifest.yaml` (section structure).
- **Outputs:** Body-specific documents (IETF Internet-Draft, ISO WD, Linux Foundation doc) with correct section numbering, boilerplate, and formatting.

## Inputs

| Input | Purpose |
|-------|---------|
| `versions/<version>/spec.md` | Full spec text (Markdown). Keep section headings in the form `## N. Title` / `### N.M Title` so they can be matched to the manifest. |
| `versions/<version>/spec-manifest.yaml` | Section IDs, numbers, and order; body-specific hints (boilerplate paths, numbering style). |
| `standardization/templates/<body>-boilerplate.md` | Optional: front matter, status, copyright for each body. |

## Conventions (spec.md)

So the spec stays easy to generate from:

- Use `## N. Title` for top-level sections and `### N.M Title` (or `### C.N Title` for appendices) for subsections.
- Use **MUST** / **SHOULD** / **MAY** consistently for requirements.
- Use Markdown tables for member definitions and code tables.
- Use fenced code blocks with language (`json`, `yaml`) for examples.

See `versions/0.1.0-draft/CONVENTIONS.md` for full conventions.

## Scripts

| Script | Purpose |
|--------|---------|
| `generate_outline.py` | Reads the manifest and (optionally) spec.md; outputs a flat section outline (e.g. for RFC TOC) or a minimal body-specific Markdown. Use as a template for full RFC/ISO generators. |

## Adding a new body generator

1. Add the body to `versions/<version>/spec-manifest.yaml` under `bodies:` (e.g. `ietf_rfc`, `iso`, `linux_foundation`).
2. Optionally add `standardization/templates/<body>-boilerplate.md` with front matter and any fixed text.
3. Add a script (e.g. `generate_ietf.py`) that:
   - Loads the manifest (YAML).
   - Parses `spec.md` (e.g. by Markdown headings) and extracts section content.
   - Applies body-specific numbering and boilerplate.
   - Writes the output file (e.g. `standardization/output/draft-adl-ietf.md`).

## Dependencies

- **generate_outline.py:** Python 3.7+; PyYAML. From repo root: `pip install -r scripts/requirements.txt` (or `pip install pyyaml`). Optional: `markdown` or `commonmark` for full spec parsing.

## Usage

```bash
# From repo root
python scripts/generate_outline.py
# Writes standardization/output/spec-outline.txt (section list)

python scripts/generate_outline.py --format rfc
# Writes RFC-style numbered TOC to stdout or a file
```
