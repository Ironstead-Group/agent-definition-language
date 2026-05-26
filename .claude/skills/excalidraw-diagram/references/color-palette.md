# Color Palette & Brand Style

**This is the single source of truth for all colors and brand-specific styles.** Colors are derived from the ADL specification site (adl-spec.org) "Ocean Blue" theme so diagrams stay on-brand. To customize for a different brand, edit this file — everything else in the skill is universal.

---

## Output Modes

Pick the palette that matches where the diagram will be published:

| Mode | Use For | Colors |
|------|---------|--------|
| **A — Site Theme** (default) | adl-spec.org docs, READMEs, slides, social cards | Brand Ocean Blue (this is the default; use it unless told otherwise) |
| **B — Standards Body Output** | IETF Internet-Draft / RFC, ISO, and other print/standards submissions | **Black & white only** — meaning encoded by shape, line style, and labels |

> Diagrams in the spec docs render inside a **white card** in both the light and dark site themes (`.adl-diagram` forces `background: #ffffff`, and the export workflow bakes a white background — see `versions/draft/diagrams/README.md`). So **Mode A is tuned for a white background and works in both site themes** from a single export. Only reach for the dark-background variant if you are intentionally producing an image that sits on a dark surface.

---

# Mode A — Site Theme (default)

On-brand Ocean Blue, tuned for the white diagram card used in both light and dark site themes.

## Shape Colors (Semantic)

Colors encode meaning, not decoration. Each semantic purpose has a fill/stroke pair.

| Semantic Purpose | Fill | Stroke |
|------------------|------|--------|
| Primary/Neutral | `#bae6fd` | `#0c4a6e` |
| Secondary | `#e0f2fe` | `#075985` |
| Tertiary | `#f0f9ff` | `#0369a1` |
| Start/Trigger | `#cffafe` | `#0e7490` |
| End/Success | `#d1fae5` | `#047857` |
| Decision | `#fef3c7` | `#b45309` |
| Warning/Reset | `#fee2e2` | `#dc2626` |
| AI/LLM | `#ccfbf1` | `#0f766e` |
| Inactive/Disabled | `#f1f5f9` | `#64748b` (use dashed stroke) |
| Error | `#fecaca` | `#b91c1c` |

**Rule**: Always pair a darker stroke with a lighter fill for contrast. The blue scale (Primary → Tertiary) is the site's `--ifm-color-primary` ramp; cyan/teal/emerald/amber/red map to the site's accent and admonition colors.

## Text Colors (Hierarchy)

Use color on free-floating text to create visual hierarchy without containers. Values are the site's light-theme text tokens (the card is white).

| Level | Color | Use For |
|-------|-------|---------|
| Title | `#0c4a6e` | Section headings, major labels (`--ifm-color-primary-darker`) |
| Subtitle | `#0369a1` | Subheadings, secondary labels (`--ifm-color-primary`) |
| Body/Detail | `#64748b` | Descriptions, annotations, metadata (`--adl-text-muted`, slate-500) |
| On light fills | `#334155` | Text inside light-colored shapes (slate-700) |
| On dark fills | `#ffffff` | Text inside dark-colored shapes |

## Evidence Artifact Colors

Used for code snippets, data examples, and other concrete evidence inside technical diagrams. The dark surface matches the site's code-block background.

| Artifact | Background | Text Color |
|----------|-----------|------------|
| Code snippet | `#0f172a` | Syntax-colored (language-appropriate) |
| JSON/data example | `#0f172a` | `#34d399` (emerald) |

## Default Stroke & Line Colors

| Element | Color |
|---------|-------|
| Arrows | Use the stroke color of the source element's semantic purpose |
| Structural lines (dividers, trees, timelines) | Primary stroke (`#0c4a6e`) or Slate (`#64748b`) |
| Marker dots (fill + stroke) | Fill `#0ea5e9`, stroke `#0369a1` |

## Background

| Property | Value |
|----------|-------|
| Canvas background | `#ffffff` |

## Dark-Background Variant (optional)

Only for diagrams intentionally placed on a **dark surface** (`#0f172a`, the site's `--ifm-background-surface-color`) — e.g. a slide or social card. These are the site's dark-theme tokens (brighter strokes, deeper fills). **Do not use these for spec docs**, which render on a white card.

| Semantic Purpose | Fill | Stroke |
|------------------|------|--------|
| Primary/Neutral | `#0c4a6e` | `#7dd3fc` |
| Secondary | `#075985` | `#38bdf8` |
| Start/Trigger | `#164e63` | `#67e8f9` |
| End/Success | `#064e3b` | `#6ee7b7` |
| Decision | `#78350f` | `#fcd34d` |
| AI/LLM | `#134e4a` | `#5eead4` |
| Warning/Error | `#7f1d1d` | `#fca5a5` |
| Inactive/Disabled | `#1e293b` | `#64748b` (use dashed stroke) |

| Text Level | Color |
|------------|-------|
| Title | `#7dd3fc` |
| Subtitle | `#38bdf8` |
| Body/Detail | `#94a3b8` (`--adl-text-muted` dark, slate-400) |
| On dark fills | `#ffffff` |

| Element | Color |
|---------|-------|
| Canvas background | `#0f172a` |
| Marker dots (fill) | `#38bdf8` |

---

# Mode B — Standards Body Output (IETF I-D / RFC, ISO)

For diagrams destined for an **IETF Internet-Draft or RFC**, an **ISO** submission, or any print/standards-body deliverable. Use this mode whenever a diagram is being prepared for the spec's IETF/release workflow (see the `ietf-id-prep` / `release-spec` skills).

## The hard rule: black & white only

The IETF SVG profile — **RFC 7996, "SVG Drawings for RFCs: SVG 1.2 RFC"** — permits **only** these color values for `fill`, `stroke`, and `color`:

```
black | white | #000000 | #FFFFFF | #ffffff | inherit
```

**Color and grayscale are not allowed.** RFCs must display correctly in monochrome (per RFC 6949: monochrome displays, black-and-white printing, and accessibility). The `svgcheck` tool (xml2rfc) validates against this schema and **deletes** non-conforming attributes — any color or gray fill will silently disappear on submission.

**Therefore, in Mode B you cannot encode meaning with color.** Encode it instead with **shape, line style, stroke width, hatching, and labels.**

## Shape Encoding (no color)

| Semantic Purpose | Fill | Stroke | Distinguish By |
|------------------|------|--------|----------------|
| Primary/Neutral | `#ffffff` | `#000000` | shape + label |
| Secondary | `#ffffff` | `#000000` | smaller size + label |
| Start/Trigger | `#ffffff` | `#000000` | rounded rect / ellipse |
| End/Success | `#ffffff` | `#000000` | double-stroke or thicker border (`strokeWidth: 3`) |
| Decision | `#ffffff` | `#000000` | diamond shape carries the meaning |
| Warning/Reset/Error | `#ffffff` | `#000000` | **dashed** stroke + label |
| AI/LLM | `#ffffff` | `#000000` | label (e.g. "LLM") + distinct shape |
| Inactive/Disabled | `#ffffff` | `#000000` | **dotted** stroke + "(disabled)" label |
| Emphasis/Hero | `#ffffff` | `#000000` | thicker stroke (`strokeWidth: 2–3`) |

## Text, Arrows, Evidence, Background

| Element | Value |
|---------|-------|
| All text | `#000000` — create hierarchy with **font size and weight**, never color |
| Arrows | `#000000` solid; differentiate parallel flows with dashed/dotted line styles |
| Structural lines | `#000000` |
| Code / JSON evidence | `#ffffff` fill, `#000000` monospaced text, solid black border (no dark surface — it must print B&W) |
| Background | `#ffffff` (or transparent) |

## Conformance Constraints (RFC 7996)

- **Fonts**: only the generic families `serif`, `sans-serif`, `monospace` are allowed. Excalidraw's hand-drawn font (fontFamily `1`, Virgil) will not conform — export with **fontFamily `2`** (sans-serif) or `3` (monospace).
- **No reliance on gradients or opacity** to convey meaning. With only black/white stops they degrade to nothing; keep fills solid (`opacity: 100`).
- **No raster images** — line art only.
- `roughness: 0` for clean, reproducible line drawings.
- **Validate before submission**: run the exported SVG through `svgcheck` (from `ietf-tools/svgcheck`) and confirm nothing is stripped.
