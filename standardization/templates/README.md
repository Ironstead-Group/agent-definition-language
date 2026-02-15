# Body-specific templates

Placeholder for **boilerplate** and **templates** used when generating body-specific output from the ADL spec.

## Purpose

- **spec.md** + **spec-manifest.yaml** (in `versions/0.1.0-draft/`) are the single source of truth.
- Scripts in `scripts/` combine that source with body-specific **boilerplate** (e.g. IETF “Status of This Memo”, ISO cover text) to produce:
  - IETF Internet-Draft–style Markdown or XML
  - ISO WD-style document
  - Linux Foundation / AAIF–style doc

## Template files (optional)

| File | Purpose |
|------|---------|
| `ietf-boilerplate.md` | IETF front matter, Status of This Memo, Copyright Notice. Prepended to generated spec body. |
| `iso-boilerplate.md` | ISO cover, scope, normative references placeholder. Prepended to generated body. |
| `linux_foundation-boilerplate.md` | LF/AAIF title and intro. Optional. |

Generators (see `scripts/README.md`) reference these paths from `spec-manifest.yaml` under `bodies.<body>.boilerplate`. Create the files when you add a full generator for that body.

## Output

Generated documents can be written to `standardization/output/` (e.g. `draft-adl-ietf.md`). That directory may be gitignored so generated drafts are local unless you choose to commit them.
