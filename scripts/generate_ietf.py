#!/usr/bin/env python3
"""
Generate an IETF Internet-Draft in kramdown-rfc format from the ADL spec.

Reads:
  - versions/draft/spec.md              (canonical spec)
  - versions/draft/spec-manifest.yaml   (section structure)
  - standardization/templates/ietf-boilerplate.md (kramdown-rfc front matter)

Writes:
  - standardization/output/draft-nederveld-adl-02.md

Usage:
  python scripts/generate_ietf.py
  python scripts/generate_ietf.py --spec versions/draft/spec.md
  python scripts/generate_ietf.py --output standardization/output/draft-nederveld-adl-02.md
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
DEFAULT_SPEC = REPO_ROOT / "versions" / "draft" / "spec.md"
DEFAULT_MANIFEST = REPO_ROOT / "versions" / "draft" / "spec-manifest.yaml"
DEFAULT_BOILERPLATE = REPO_ROOT / "standardization" / "templates" / "ietf-boilerplate.md"
DEFAULT_OUTPUT = REPO_ROOT / "standardization" / "output" / "draft-nederveld-adl-04.md"

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
# Keep in sync with the references defined in spec.md Section 19 (and the
# normative/informative blocks of the kramdown boilerplate).
INLINE_CITATIONS = {
    "[RFC2119]": "{{RFC2119}}",
    "[RFC3986]": "{{RFC3986}}",
    "[RFC6749]": "{{RFC6749}}",
    "[RFC6838]": "{{RFC6838}}",
    "[RFC6901]": "{{RFC6901}}",
    "[RFC7636]": "{{RFC7636}}",
    "[RFC8126]": "{{RFC8126}}",
    "[RFC8141]": "{{RFC8141}}",
    "[RFC8174]": "{{RFC8174}}",
    "[RFC8259]": "{{RFC8259}}",
    "[RFC8615]": "{{RFC8615}}",
    "[RFC8705]": "{{RFC8705}}",
    "[RFC8785]": "{{RFC8785}}",
    "[RFC9449]": "{{RFC9449}}",
    "[RFC9700]": "{{RFC9700}}",
    "[OAUTH2.1]": "{{OAUTH2.1}}",
    "[OPENID-CONNECT]": "{{OPENID-CONNECT}}",
    "[A2A]": "{{A2A}}",
    "[JSON-SCHEMA]": "{{JSON-SCHEMA}}",
    "[MCP]": "{{MCP}}",
    "[OPENAPI]": "{{OPENAPI}}",
    "[W3C.DID]": "{{W3C.DID}}",
    "[W3C.VC]": "{{W3C.VC}}",
    "[ISO-22989]": "{{ISO-22989}}",
    "[AI-PROTOCOLS]": "{{AI-PROTOCOLS}}",
    "[CLTC-AGENTIC]": "{{CLTC-AGENTIC}}",
    "[IMDA-AGENTIC]": "{{IMDA-AGENTIC}}",
}

# Base URL for the published spec site (Docusaurus `url` in site config).
# Site-relative links such as /protocol/runtime are rewritten to absolute
# URLs under this origin so companion pages resolve from the draft.
SITE_BASE_URL = "https://adl-spec.org"


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
    # Drop Markdown images: ![alt](path). The spec's figures are external SVG
    # diagrams that cannot render in a text I-D; kramdown-rfc would otherwise emit
    # an element invalid as a section child. The following italic "*Figure N
    # (informative): ...*" caption is retained and describes the figure.
    text = re.sub(r'!\[[^\]]*\]\([^)]*\)\n?', '', text)

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

    # Rewrite site-relative links (e.g. /protocol/runtime, /spec/next#...) to
    # absolute URLs under the published site origin so companion pages resolve
    # from the draft. Runs after the http-link handling above so these are not
    # stripped to plain text.
    # Strip emphasis/code inside the label (e.g. [**ADL Trust Protocol**](...) or
    # [`anomaly_baseline`](...)) so the resulting <eref> has plain-text content;
    # xml2rfc rejects <strong>/<tt> nested inside <eref>.
    def _clean_label(text_label: str) -> str:
        for mark in ("**", "__", "`", "*", "_"):
            text_label = text_label.replace(mark, "")
        return text_label

    text = re.sub(
        r'\[([^\[\]]+)\]\((/[^)]*)\)',
        lambda m: f'[{_clean_label(m.group(1))}]({SITE_BASE_URL}{m.group(2)})',
        text,
    )

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


def slug_anchor(number: str, is_appendix: bool) -> str:
    """Stable kramdown-rfc anchor for a section/appendix number.

    "17.3" -> "sec-17-3"; appendix "D" -> "app-d"; "C.1" -> "app-c-1".
    """
    norm = number.replace(".", "-").lower()
    return ("app-" if is_appendix else "sec-") + norm


def build_anchor_map(spec_text: str) -> dict:
    """Map Core section/appendix numbers to anchors, from the spec headings.

    Only numbers that end up in the draft body get an entry: sections 1-18
    (Section 19 References is rendered from the YAML front matter, not the body)
    and appendices A-D. Used to convert in-text cross-references to xrefs.
    """
    amap: dict[str, str] = {}
    for line in spec_text.split("\n"):
        m = re.match(r'^##\s+Appendix\s+([A-Z])\.\s+', line)
        if m:
            amap[m.group(1)] = slug_anchor(m.group(1), True)
            continue
        m = re.match(r'^#{3,6}\s+([A-Z]\.\d+)\s+', line)
        if m:
            amap[m.group(1)] = slug_anchor(m.group(1), True)
            continue
        m = re.match(r'^#{2,6}\s+(\d+(?:\.\d+)*)\.?\s+\S', line)
        if m:
            num = m.group(1)
            if int(num.split(".")[0]) <= 18:
                amap[num] = slug_anchor(num, False)
    return amap


def _external_ref_before(line: str, start: int) -> bool:
    """True if the reference at `start` is qualified by another document and so
    must NOT be rewritten to a Core anchor.

    Catches an external RFC ("RFC 5234 Section 6", "RFC 5234, Appendix B", or the
    converted "{{RFC5234}}" form), a companion protocol ("... Protocol ..."), and
    an explicit "that document".
    """
    pre = line[max(0, start - 35):start]
    return bool(re.search(
        r'(?:RFC\s*\d+|\{\{RFC\d+\}\})[\s,)]*$'
        r'|[Pp]rotocol\b\W*$|that document\W*$|/protocol/\w+\)?\s*(?:as\s+)?$',
        pre,
    ))


def _xref_line(line: str, amap: dict) -> str:
    """Convert in-text cross-references on a single (non-code) line to xrefs.

    Converts the provably-Core reference forms to kramdown-rfc (#anchor):
    - "Section N(.M...)" and "Appendix X(.N)" (the word disambiguates Core from
      the companion protocols, which always use the "§" form), unless the
      reference is qualified by another document (an RFC number, a companion
      Protocol, or "that document") -- see _external_ref_before.
    - bare "§N.M..." only when the top-level number is >= 4 AND it has a
      subsection AND it is in the Core map AND it is not qualified by another
      document. The low-numbered "§" forms (§1.x, §2.x, §3.x and bare top-level)
      collide with the Trust/Runtime protocols' own section numbers, so they are
      left as literal text.
    """
    def sec_repl(m: re.Match) -> str:
        if _external_ref_before(line, m.start()):
            return m.group(0)
        anc = amap.get(m.group(1))
        # kramdown-rfc resolves {{anchor}} to a self-filling <xref> ("Section N");
        # a bare (#anchor) is left as literal text, so it must not be used.
        return "{{" + anc + "}}" if anc else m.group(0)

    line = re.sub(r'\bSection\s+(\d+(?:\.\d+)*)', sec_repl, line)
    line = re.sub(r'\bAppendix\s+([A-Z](?:\.\d+)?)', sec_repl, line)

    def para_repl(m: re.Match) -> str:
        num = m.group(1)
        if "." not in num or int(num.split(".")[0]) < 4:
            return m.group(0)
        anc = amap.get(num)
        if not anc:
            return m.group(0)
        if _external_ref_before(line, m.start()):
            return m.group(0)
        # {{anchor}} renders as "Section N.M"; replaces the "§N.M" source token.
        return "{{" + anc + "}}"

    return re.sub(r'§(\d+(?:\.\d+)*)', para_repl, line)


def convert_xrefs(text: str, amap: dict) -> str:
    """Convert in-text section/appendix cross-references to kramdown-rfc xrefs.

    Skips fenced code blocks so references inside examples/ABNF are untouched.
    """
    lines = text.split("\n")
    result = []
    in_code_block = False
    for line in lines:
        if line.strip().startswith("```"):
            in_code_block = not in_code_block
            result.append(line)
            continue
        result.append(line if in_code_block else _xref_line(line, amap))
    return "\n".join(result)


def strip_section_numbers(text: str) -> str:
    """Remove manual section numbers from headings and assign stable anchors.

    kramdown-rfc auto-numbers sections, so we strip "1. ", "1.1 ", etc., and
    attach a `{#anchor}` derived from the original number so in-text xrefs
    (see convert_xrefs) resolve.
    """
    lines = text.split("\n")
    result = []
    for line in lines:
        # # Appendix A. JSON Schema -> # JSON Schema {#app-a}
        m = re.match(r'^(#+)\s+Appendix\s+([A-Z])\.\s+(.+)', line)
        if m:
            anc = slug_anchor(m.group(2), True)
            result.append(f"{m.group(1)} {m.group(3)} {{#{anc}}}")
            continue

        # ## C.1 Title -> ## Title {#app-c-1} (appendix subsections)
        m = re.match(r'^(#+)\s+([A-Z]\.\d+)\s+(.+)', line)
        if m:
            anc = slug_anchor(m.group(2), True)
            result.append(f"{m.group(1)} {m.group(3)} {{#{anc}}}")
            continue

        # # 1. Introduction / ## 1.1 Purpose / ### 10.3.3 Title -> Title {#sec-...}
        m = re.match(r'^(#+)\s+(\d+(?:\.\d+)*)\.?\s+(.+)', line)
        if m:
            anc = slug_anchor(m.group(2), False)
            result.append(f"{m.group(1)} {m.group(3)} {{#{anc}}}")
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

    # Section/appendix number -> anchor map, for in-text cross-reference xrefs.
    anchor_map = build_anchor_map(spec_text)

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
    middle_content = convert_xrefs(middle_content, anchor_map)
    middle_content = normalize_ascii(middle_content)

    # Apply transformations to back content
    back_content = convert_spec_links(back_content)
    back_content = fix_html_entities(back_content)
    back_content = convert_inline_citations(back_content)
    back_content = escape_kramdown_syntax(back_content)
    back_content = strip_horizontal_rules(back_content)
    back_content = adjust_heading_levels(back_content)
    back_content = strip_section_numbers(back_content)
    back_content = convert_xrefs(back_content, anchor_map)
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


# --- Protocol-layer Internet-Drafts (the cluster companions to Core) ----------
#
# The protocol documents (Trust, Runtime) are flatter than Core: they number
# their own sections (Trust Authentication is its own Section 1), carry named
# trailing sections (IANA/Security/References) and their own reference lists, and
# cross-reference Core and each other. They become separate I-Ds in the same
# draft-nederveld-adl-* family, submitted as a cluster.

PROTOCOLS = {
    "trust": {
        "src": REPO_ROOT / "protocol" / "draft" / "trust-protocol.md",
        "boilerplate": REPO_ROOT / "standardization" / "templates" / "ietf-boilerplate-trust.md",
        "output": REPO_ROOT / "standardization" / "output" / "draft-nederveld-adl-trust-00.md",
        "self_slug": "trust",
        "sibling_slug": "runtime",
        "sibling_name": "Runtime Protocol",
        "sibling_ref": "ADL-RUNTIME",
        "ref_keys": {"RFC2119", "RFC3986", "RFC6648", "RFC6750", "RFC8126", "RFC8174",
                     "RFC8785", "RFC9110", "RFC8693", "RFC9449", "W3C.DID-WEB",
                     "ADL-CORE", "ADL-RUNTIME"},
    },
    "runtime": {
        "src": REPO_ROOT / "protocol" / "draft" / "runtime-protocol.md",
        "boilerplate": REPO_ROOT / "standardization" / "templates" / "ietf-boilerplate-runtime.md",
        "output": REPO_ROOT / "standardization" / "output" / "draft-nederveld-adl-runtime-00.md",
        "self_slug": "runtime",
        "sibling_slug": "trust",
        "sibling_name": "Trust Protocol",
        "sibling_ref": "ADL-TRUST",
        "ref_keys": {"RFC2119", "RFC8174", "RFC8785", "RFC6962", "XACML",
                     "NIST.SP.800-162", "ADL-CORE", "ADL-TRUST"},
    },
}


def strip_protocol_frontmatter(text: str) -> str:
    """Drop the Docusaurus YAML front matter, the H1 title, and the Version/Status
    lines -- all of that is carried by the kramdown-rfc boilerplate instead."""
    text = re.sub(r'^---\n.*?\n---\n', '', text, count=1, flags=re.S)
    text = re.sub(r'^#\s+.+\n', '', text, count=1, flags=re.M)
    text = re.sub(r'^\*\*Version:\*\*.*\n', '', text, flags=re.M)
    text = re.sub(r'^\*\*Status:\*\*.*\n', '', text, flags=re.M)
    return text


def protocol_links_to_citations(text: str, cfg: dict) -> str:
    """Rewrite site-relative companion links to cluster citations.

    [.. ](/spec..) -> {{ADL-CORE}}; the sibling protocol -> its citation; a
    self-link is reduced to its label text (a document does not cite itself).
    """
    text = re.sub(r'\[[^\]]*\]\(/spec[^)]*\)', '{{ADL-CORE}}', text)
    text = re.sub(rf'\[[^\]]*\]\(/protocol/{cfg["sibling_slug"]}[^)]*\)',
                  '{{' + cfg["sibling_ref"] + '}}', text)
    text = re.sub(rf'\[([^\]]*)\]\(/protocol/{cfg["self_slug"]}[^)]*\)', r'\1', text)
    return text


def protocol_inline_refs(text: str, cfg: dict) -> str:
    """Convert inline [KEY] reference markers to {{KEY}} citations (defined keys only)."""
    def repl(m: re.Match) -> str:
        return "{{" + m.group(1) + "}}" if m.group(1) in cfg["ref_keys"] else m.group(0)
    return re.sub(r'\[([A-Z][A-Z0-9.\-]+)\](?!\()', repl, text)


def protocol_cross_refs(text: str, cfg: dict) -> str:
    """Wire textual cross-document references to the sibling and to Core.

    "Trust Protocol §1.1.3" -> "Section 1.1.3 of {{ADL-TRUST}}"; a bare sibling
    name -> its citation; "Core §" is reduced to "§" so the section-number pass
    routes out-of-range numbers to Core.
    """
    sib, ref = cfg["sibling_name"], cfg["sibling_ref"]
    # Sibling section refs, allowing a possessive ("Trust Protocol's §1.1.3") and
    # a slash/dash-joined list ("§1.1.3/§1.1.5") whose trailing members would
    # otherwise lose the qualifier and mis-route to Core.
    def _sib_sections(m: re.Match) -> str:
        nums = re.findall(r'\d+(?:\.\d+)*', m.group(0))
        joined = ", ".join(f"Section {n}" for n in nums)
        return f"{joined} of {{{{{ref}}}}}"
    text = re.sub(rf'{re.escape(sib)}(?:’s|\'s)?\s+§\d+(?:\.\d+)*(?:[/–-]§\d+(?:\.\d+)*)*',
                  _sib_sections, text)
    text = re.sub(re.escape(sib), '{{' + ref + '}}', text)
    text = re.sub(r'\bCore §', '§', text)
    return text


def protocol_intra_xrefs(text: str, amap: dict) -> str:
    """Resolve bare in-text "§N.M" references.

    A number in this document's own heading map becomes a self {{anchor}} xref
    (rendered "Section N.M"); any other number is a reference into Core.
    """
    def repl(m: re.Match) -> str:
        num = m.group(1)
        anc = amap.get(num)
        if anc:
            return "{{" + anc + "}}"
        return f"Section {num} of {{{{ADL-CORE}}}}"

    lines, out, in_code = text.split("\n"), [], False
    for line in lines:
        if line.strip().startswith("```"):
            in_code = not in_code
            out.append(line)
            continue
        out.append(line if in_code else re.sub(r'§(\d+(?:\.\d+)*)', repl, line))
    return "\n".join(out)


def add_introduction(text: str) -> str:
    """Give the leading prose a home under a numbered Introduction.

    The protocol sources open with prose before their first heading; an RFC needs
    that under a section. xml2rfc forbids an unnumbered section before numbered
    ones, so the Introduction is numbered like any other section. In-text section
    references use self-filling {{anchor}} xrefs, so the rendered document stays
    internally consistent regardless of the resulting RFC section numbers.
    """
    lines = text.split("\n")
    head_idx = next((i for i, l in enumerate(lines) if re.match(r'^#\s', l)), len(lines))
    prose = lines[:head_idx]
    if not any(s.strip() for s in prose):
        return text
    return "\n".join(['# Introduction', ''] + prose + lines[head_idx:])


def generate_protocol(key: str, spec_override: Path | None, output_override: Path | None) -> None:
    """Generate a protocol-layer Internet-Draft (Trust or Runtime)."""
    cfg = PROTOCOLS[key]
    spec_path = spec_override or cfg["src"]
    output_path = output_override or cfg["output"]
    boilerplate_path = cfg["boilerplate"]

    spec_text = load_text(spec_path)
    boilerplate_text = load_text(boilerplate_path)
    anchor_map = build_anchor_map(spec_text)

    front_and_abstract, middle_marker, back_marker = split_boilerplate(boilerplate_text)

    body = strip_protocol_frontmatter(spec_text)
    body = body.split("## References")[0]  # references come from the boilerplate front matter

    body = protocol_links_to_citations(body, cfg)
    body = convert_spec_links(body)
    body = fix_html_entities(body)
    body = protocol_inline_refs(body, cfg)
    body = convert_inline_citations(body)
    body = protocol_cross_refs(body, cfg)
    body = escape_kramdown_syntax(body)
    body = convert_bcp14_keywords(body)
    body = strip_horizontal_rules(body)
    body = adjust_heading_levels(body)
    body = strip_section_numbers(body)
    body = protocol_intra_xrefs(body, anchor_map)
    body = add_introduction(body)
    body = normalize_ascii(body)

    back_content = normalize_ascii('# Acknowledgments\n{:numbered="false"}\n\nTBD\n')

    output = (front_and_abstract + middle_marker + "\n" + body.strip() + "\n"
              + back_marker + "\n" + back_content)

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
        "--protocol", choices=sorted(PROTOCOLS),
        help="generate a protocol-layer I-D (trust or runtime) instead of Core"
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

    if args.protocol:
        spec_override = args.spec if args.spec != DEFAULT_SPEC else None
        output_override = args.output if args.output != DEFAULT_OUTPUT else None
        generate_protocol(args.protocol, spec_override, output_override)
    else:
        generate(args.spec, args.manifest, args.boilerplate, args.output)


if __name__ == "__main__":
    main()
