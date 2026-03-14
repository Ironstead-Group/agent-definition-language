#!/usr/bin/env python3
"""
Generate an IETF Internet-Draft in kramdown-rfc format from the ADL spec.

Reads:
  - versions/0.1.0/spec.md              (canonical spec)
  - versions/0.1.0/spec-manifest.yaml   (section structure)
  - standardization/templates/ietf-boilerplate.md (kramdown-rfc front matter)

Writes:
  - standardization/output/draft-nederveld-adl-01.md

Usage:
  python scripts/generate_ietf.py
  python scripts/generate_ietf.py --spec versions/0.1.0/spec.md
  python scripts/generate_ietf.py --output standardization/output/draft-nederveld-adl-01.md
"""

import argparse
import re
import sys
from pathlib import Path

try:
    import yaml
except ImportError:
    print("pip install pyyaml", file=sys.stderr)
    sys.exit(1)


REPO_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_SPEC = REPO_ROOT / "versions" / "0.1.0" / "spec.md"
DEFAULT_MANIFEST = REPO_ROOT / "versions" / "0.1.0" / "spec-manifest.yaml"
DEFAULT_BOILERPLATE = REPO_ROOT / "standardization" / "templates" / "ietf-boilerplate.md"
DEFAULT_OUTPUT = REPO_ROOT / "standardization" / "output" / "draft-nederveld-adl-02.md"

# Map link text to kramdown-rfc citation keys.
# Used to convert [label](url) or <a href="...">label</a> to {{label}} citations.
LINK_CITATIONS = {
    "JSON [RFC8259]": "JSON {{RFC8259}}",
    "JSON Schema": "**JSON Schema** {{JSON-SCHEMA}}",
    "A2A Protocol": "**A2A Protocol** {{A2A}}",
    "Model Context Protocol (MCP)": "**Model Context Protocol (MCP)** {{MCP}}",
    "OpenAPI": "**OpenAPI** {{OPENAPI}}",
    "W3C DIDs": "**W3C DIDs** {{W3C.DID}}",
    "Verifiable Credentials": "**Verifiable Credentials** {{W3C.VC}}",
}

# RFC 2119 / 8174 keywords that get {bcp14} spans in kramdown-rfc.
BCP14_KEYWORDS = [
    "MUST NOT",
    "MUST",
    "REQUIRED",
    "SHALL NOT",
    "SHALL",
    "SHOULD NOT",
    "SHOULD",
    "NOT RECOMMENDED",
    "RECOMMENDED",
    "MAY",
    "OPTIONAL",
]

# Inline citation replacements: spec text -> kramdown-rfc citation.
INLINE_CITATIONS = {
    "[RFC2119]": "{{RFC2119}}",
    "[RFC3986]": "{{RFC3986}}",
    "[RFC6838]": "{{RFC6838}}",
    "[RFC6901]": "{{RFC6901}}",
    "[RFC8126]": "{{RFC8126}}",
    "[RFC8141]": "{{RFC8141}}",
    "[RFC8174]": "{{RFC8174}}",
    "[RFC8259]": "{{RFC8259}}",
    "[RFC8615]": "{{RFC8615}}",
    "[RFC8785]": "{{RFC8785}}",
    "[A2A]": "{{A2A}}",
    "[JSON-SCHEMA]": "{{JSON-SCHEMA}}",
    "[MCP]": "{{MCP}}",
    "[OPENAPI]": "{{OPENAPI}}",
    "[W3C.DID]": "{{W3C.DID}}",
    "[W3C.VC]": "{{W3C.VC}}",
    "[ISO-22989]": "{{ISO-22989}}",
}


def load_text(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def load_manifest(path: Path) -> dict:
    with open(path, encoding="utf-8") as f:
        return yaml.safe_load(f)


def split_boilerplate(text: str) -> tuple[str, str, str]:
    """Split boilerplate into front-matter, abstract, and back marker.

    Returns (front_matter_with_abstract, middle_marker, back_marker).
    The front matter includes everything up to and including '--- middle'.
    """
    # Find the positions of the three section markers
    abstract_pos = text.find("--- abstract")
    middle_pos = text.find("--- middle")
    back_pos = text.find("--- back")

    if abstract_pos == -1 or middle_pos == -1 or back_pos == -1:
        print("ERROR: boilerplate must contain --- abstract, --- middle, --- back markers",
              file=sys.stderr)
        sys.exit(1)

    # Everything up to (but not including) --- middle is front + abstract
    front_and_abstract = text[:middle_pos].rstrip() + "\n"
    # The middle and back markers
    middle_marker = "\n--- middle\n"
    back_marker = "\n--- back\n"
    return front_and_abstract, middle_marker, back_marker


def convert_spec_links(text: str) -> str:
    """Convert Markdown links and HTML links to kramdown-rfc citations or plain text.

    Handles both [label](url) Markdown links and <a href>label</a> HTML links.
    Known spec references are converted to kramdown-rfc {{citation}} syntax.
    """
    # Replace known Markdown links with kramdown-rfc citations.
    # Handle nested brackets like [JSON [RFC8259]](url) by matching each known label.
    for link_text, citation in LINK_CITATIONS.items():
        # Escape special regex chars in link_text, but keep [ and ] literal
        escaped = re.escape(link_text)
        pattern = r'\[' + escaped + r'\]\(https?://[^)]+\)'
        text = re.sub(pattern, citation, text)

    # Catch any remaining Markdown links and convert to plain text
    def replace_unknown_link(match: re.Match) -> str:
        return match.group(1)

    text = re.sub(r'\[([^\[\]]+)\]\(https?://[^)]+\)', replace_unknown_link, text)

    def replace_html_link(match: re.Match) -> str:
        label = match.group(1)
        for link_text, citation in LINK_CITATIONS.items():
            if link_text in label:
                return citation
        return label

    # Replace any remaining <a> tags with their label text + citation
    text = re.sub(r'<a\s+href="[^"]*"[^>]*>(.*?)</a>', replace_html_link, text)
    # Clean up doubled bold markers from **[link](url)** → ****Label** {{CIT}}**
    text = text.replace("****", "**")
    # Remove stray trailing bold after citations: {{CIT}}** → {{CIT}}
    text = re.sub(r'(\}\})\*\*', r'\1', text)
    return text


def fix_html_entities(text: str) -> str:
    """Replace HTML entities with plain text equivalents."""
    replacements = {
        "&lt;": "<",
        "&gt;": ">",
        "&amp;": "&",
        "&quot;": '"',
        "&#39;": "'",
    }
    for entity, replacement in replacements.items():
        text = text.replace(entity, replacement)
    return text


def convert_bcp14_keywords(text: str) -> str:
    """Convert bold RFC 2119 keywords to kramdown-rfc {bcp14} spans.

    Converts **MUST** to **MUST**{:bcp14}, etc. Avoids converting keywords
    inside code blocks, the requirements language boilerplate section, or
    table cells where the keyword is the definition value.
    """
    lines = text.split("\n")
    result = []
    in_code_block = False
    in_requirements_section = False

    for line in lines:
        # Track code blocks
        if line.strip().startswith("```"):
            in_code_block = not in_code_block
            result.append(line)
            continue

        if in_code_block:
            result.append(line)
            continue

        # Track requirements language section (Section 2) — skip the boilerplate
        if re.match(r'^##?\s+.*Requirements Language', line):
            in_requirements_section = True
            result.append(line)
            continue
        if in_requirements_section and re.match(r'^##?\s+', line):
            in_requirements_section = False

        if in_requirements_section:
            # Replace bold keywords with quoted keywords per RFC 8174 boilerplate
            for kw in BCP14_KEYWORDS:
                line = line.replace(f"**{kw}**", f'"{kw}"')
            result.append(line)
            continue

        # Convert BCP14 keywords (longest match first to handle "MUST NOT" before "MUST")
        for kw in BCP14_KEYWORDS:
            # Match **KEYWORD** that is NOT already followed by {:bcp14}
            pattern = re.compile(
                r'\*\*' + re.escape(kw) + r'\*\*(?!\{:bcp14\})'
            )
            line = pattern.sub(f"**{kw}**{{:bcp14}}", line)

        result.append(line)

    return "\n".join(result)


def convert_inline_citations(text: str) -> str:
    """Replace [RFC2119] style references with {{RFC2119}} kramdown-rfc citations."""
    for spec_ref, kramdown_ref in INLINE_CITATIONS.items():
        text = text.replace(spec_ref, kramdown_ref)
    return text


def escape_kramdown_syntax(text: str) -> str:
    """Escape patterns that conflict with kramdown-rfc syntax.

    Fixes three classes of issues:
    - [this document] and [date of publication] look like Markdown link references
    - {{ }} inside code blocks triggers kramdown-rfc citation parsing
    """
    # Escape bracket expressions that are not links or citations
    text = text.replace("[this document]", "\\[this document\\]")
    text = text.replace("[date of publication]", "\\[date of publication\\]")

    # Inside fenced code blocks, escape {{ and }} to prevent
    # kramdown-rfc from interpreting them as citation references.
    # Uses ABNF-compatible hex notation: 2%x7B for {{ and 2%x7D for }}
    lines = text.split("\n")
    result = []
    in_code_block = False
    for line in lines:
        if line.strip().startswith("```"):
            in_code_block = not in_code_block
            result.append(line)
            continue
        if in_code_block:
            line = line.replace('"{{" ', '2%x7B ')
            line = line.replace(' "}}"', ' 2%x7D')
        result.append(line)
    return "\n".join(result)


def normalize_ascii(text: str) -> str:
    """Replace non-ASCII characters with ASCII equivalents for IETF compliance."""
    text = text.replace("\u2014", " -- ")   # em-dash
    text = text.replace("\u2013", "-")       # en-dash
    text = text.replace("\u2192", "->")      # right arrow
    text = text.replace("\u2265", ">=")      # greater-than-or-equal
    return text


def add_code_markers(text: str) -> str:
    """Wrap the ABNF grammar code block with CODE BEGINS/CODE ENDS markers.

    Targets the ABNF block in Appendix D (identified by the ```abnf fence).
    JSON example blocks are inline illustrations and don't need markers.
    """
    lines = text.split("\n")
    result = []
    i = 0
    while i < len(lines):
        line = lines[i]
        if line.strip().startswith("```abnf"):
            result.append("\\<CODE BEGINS>")
            result.append(line)
            i += 1
            while i < len(lines):
                result.append(lines[i])
                if lines[i].strip() == "```":
                    result.append("\\<CODE ENDS>")
                    break
                i += 1
        else:
            result.append(line)
        i += 1
    return "\n".join(result)


def extract_sections(spec_text: str) -> dict:
    """Parse spec.md into sections keyed by section number.

    Returns a dict mapping section identifiers to their content.
    Special keys: 'title_block' for the title/version header,
    'appendix_A', 'appendix_B', 'appendix_C' for appendices.
    """
    lines = spec_text.split("\n")
    sections = {}
    current_key = "title_block"
    current_lines = []

    for line in lines:
        # Match top-level sections: ## N. Title or ## Appendix X. Title
        top_match = re.match(r'^## (\d+)\.\s+(.+)', line)
        appendix_match = re.match(r'^## Appendix ([A-Z])\.\s+(.+)', line)

        if top_match:
            # Save previous section
            if current_lines:
                sections[current_key] = "\n".join(current_lines)
            current_key = top_match.group(1)
            current_lines = [line]
            continue
        elif appendix_match:
            if current_lines:
                sections[current_key] = "\n".join(current_lines)
            current_key = f"appendix_{appendix_match.group(1)}"
            current_lines = [line]
            continue

        current_lines.append(line)

    # Save last section
    if current_lines:
        sections[current_key] = "\n".join(current_lines)

    return sections


def strip_horizontal_rules(text: str) -> str:
    """Remove Markdown horizontal rules (---) that are not YAML front matter."""
    lines = text.split("\n")
    result = []
    for line in lines:
        if line.strip() == "---":
            continue
        result.append(line)
    return "\n".join(result)


def adjust_heading_levels(text: str) -> str:
    """Promote all headings one level for kramdown-rfc.

    kramdown-rfc uses # for top-level sections (which become RFC section 1, 2, etc).
    The spec uses ## for top-level and ### for subsections, so we remove one #.
    """
    lines = text.split("\n")
    result = []
    for line in lines:
        # #### -> ### (sub-subsection)
        if line.startswith("#### "):
            result.append(line[1:])
        # ### N.M -> ## N.M (subsection)
        elif line.startswith("### "):
            result.append(line[1:])
        # ## N. -> # N. (top-level section)
        elif line.startswith("## "):
            result.append(line[1:])
        else:
            result.append(line)
    return "\n".join(result)


def strip_section_numbers(text: str) -> str:
    """Remove manual section numbers from headings.

    kramdown-rfc auto-numbers sections, so we strip "1. ", "1.1 ", etc.
    Also converts "Appendix A." style to just the title.
    """
    lines = text.split("\n")
    result = []
    for line in lines:
        # # 1. Introduction -> # Introduction
        m = re.match(r'^(#+)\s+\d+\.\s+(.+)', line)
        if m:
            result.append(f"{m.group(1)} {m.group(2)}")
            continue

        # ## 1.1 Purpose -> ## Purpose
        m = re.match(r'^(#+)\s+\d+\.\d+\s+(.+)', line)
        if m:
            result.append(f"{m.group(1)} {m.group(2)}")
            continue

        # # Appendix A. JSON Schema -> # JSON Schema
        m = re.match(r'^(#+)\s+Appendix\s+[A-Z]\.\s+(.+)', line)
        if m:
            result.append(f"{m.group(1)} {m.group(2)}")
            continue

        # ## C.1 Title -> ## Title (appendix subsections)
        m = re.match(r'^(#+)\s+[A-Z]\.\d+\s+(.+)', line)
        if m:
            result.append(f"{m.group(1)} {m.group(2)}")
            continue

        result.append(line)
    return "\n".join(result)


def build_middle_content(sections: dict) -> str:
    """Build the --- middle content from parsed sections.

    Includes sections 1-18, excluding 19 (References — handled by YAML front matter).
    """
    middle_parts = []
    for i in range(1, 19):
        key = str(i)
        if key in sections:
            middle_parts.append(sections[key])

    content = "\n\n".join(middle_parts)
    return content


def build_back_content(sections: dict) -> str:
    """Build the --- back content from appendices."""
    back_parts = []
    for suffix in ["A", "B", "C", "D"]:
        key = f"appendix_{suffix}"
        if key in sections:
            back_parts.append(sections[key])

    content = "\n\n".join(back_parts)

    # Add acknowledgments placeholder
    content += "\n\n# Acknowledgments\n{:numbered=\"false\"}\n\nTBD\n"

    return content


def generate(spec_path: Path, manifest_path: Path, boilerplate_path: Path,
             output_path: Path) -> None:
    """Main generation pipeline."""
    # Load inputs
    spec_text = load_text(spec_path)
    load_manifest(manifest_path)  # validate it loads; structure used for future features
    boilerplate_text = load_text(boilerplate_path)

    # Split boilerplate into parts
    front_and_abstract, middle_marker, back_marker = split_boilerplate(boilerplate_text)

    # Parse spec into sections
    sections = extract_sections(spec_text)

    # Build middle content (sections 1-18)
    middle_content = build_middle_content(sections)

    # Build back content (appendices)
    back_content = build_back_content(sections)

    # Apply transformations to middle content
    middle_content = convert_spec_links(middle_content)
    middle_content = fix_html_entities(middle_content)
    middle_content = convert_inline_citations(middle_content)
    middle_content = escape_kramdown_syntax(middle_content)
    middle_content = convert_bcp14_keywords(middle_content)
    middle_content = strip_horizontal_rules(middle_content)
    middle_content = adjust_heading_levels(middle_content)
    middle_content = strip_section_numbers(middle_content)
    middle_content = normalize_ascii(middle_content)

    # Apply transformations to back content
    back_content = convert_spec_links(back_content)
    back_content = fix_html_entities(back_content)
    back_content = convert_inline_citations(back_content)
    back_content = escape_kramdown_syntax(back_content)
    back_content = strip_horizontal_rules(back_content)
    back_content = adjust_heading_levels(back_content)
    back_content = strip_section_numbers(back_content)
    back_content = add_code_markers(back_content)
    back_content = normalize_ascii(back_content)

    # Assemble final document
    output = (
        front_and_abstract
        + middle_marker
        + "\n"
        + middle_content.strip()
        + "\n"
        + back_marker
        + "\n"
        + back_content.strip()
        + "\n"
    )

    # Write output
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(output, encoding="utf-8")
    print(f"Generated: {output_path}", file=sys.stderr)
    print(f"  Spec source: {spec_path}", file=sys.stderr)
    print(f"  Boilerplate: {boilerplate_path}", file=sys.stderr)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Generate IETF Internet-Draft (kramdown-rfc) from ADL spec"
    )
    parser.add_argument(
        "--spec", type=Path, default=DEFAULT_SPEC,
        help=f"Path to spec.md (default: {DEFAULT_SPEC.relative_to(REPO_ROOT)})"
    )
    parser.add_argument(
        "--manifest", type=Path, default=DEFAULT_MANIFEST,
        help=f"Path to spec-manifest.yaml (default: {DEFAULT_MANIFEST.relative_to(REPO_ROOT)})"
    )
    parser.add_argument(
        "--boilerplate", type=Path, default=DEFAULT_BOILERPLATE,
        help=f"Path to boilerplate template (default: {DEFAULT_BOILERPLATE.relative_to(REPO_ROOT)})"
    )
    parser.add_argument(
        "--output", type=Path, default=DEFAULT_OUTPUT,
        help=f"Output path (default: {DEFAULT_OUTPUT.relative_to(REPO_ROOT)})"
    )
    args = parser.parse_args()

    generate(args.spec, args.manifest, args.boilerplate, args.output)


if __name__ == "__main__":
    main()
