#!/usr/bin/env python3
"""
Standards-body readiness report for the ADL draft spec.

Runs two lenses over the EDITABLE draft (never the frozen versions/<x.y.z>/ or
generated site/ output) and prints a Markdown report:

  - IETF: the mechanical I-D blockers (reference apparatus, required sections,
    RFC 2119 boilerplate, docname/version consistency).
  - USPTO: a consistency-and-flagging linter (patent-notice consistency,
    provisional/priority presence, claimable-mechanism presence, prior-art
    flags). NOT a patentability or priority-date determination.

Each finding has a tier: ERROR (must be resolved before merge) or WARNING
(advisory). The process exit code equals the number of ERRORs, so CI can gate
on it. idnits itself runs in the workflow (needs kramdown-rfc/xml2rfc); this
script is the deterministic, network-free core.

Usage:
  python scripts/standards_readiness.py                 # Markdown to stdout
  python scripts/standards_readiness.py --output report.md
"""

from __future__ import annotations

import argparse
import re
import sys
from dataclasses import dataclass
from pathlib import Path

try:
    import yaml
except ImportError:
    print("pip install pyyaml", file=sys.stderr)
    sys.exit(2)

REPO_ROOT = Path(__file__).resolve().parent.parent
SPEC = REPO_ROOT / "versions" / "draft" / "spec.md"
BOILERPLATE = REPO_ROOT / "standardization" / "templates" / "ietf-boilerplate.md"
MANIFEST = REPO_ROOT / "versions" / "manifest.yaml"
GENERATOR = REPO_ROOT / "scripts" / "generate_ietf.py"
TRUST = REPO_ROOT / "protocol" / "draft" / "trust-protocol.md"
RUNTIME = REPO_ROOT / "protocol" / "draft" / "runtime-protocol.md"
PROVISIONAL_SNAPSHOT = REPO_ROOT / "versions" / "0.1.0" / "spec.md"

# Files an editable-paths consistency check may read for the patent notice.
PATENT_FILES = [
    REPO_ROOT / "versions" / "draft" / "spec.md",
    REPO_ROOT / "README.md",
    REPO_ROOT / "CONTRIBUTING.md",
    REPO_ROOT / "PATENTS",
]

# Reference-token alphabet (matches spec.md Section 19 keys).
REF_TOKEN = re.compile(
    r"\[("
    r"RFC\d+|W3C\.[A-Z0-9.\-]+|OAUTH2\.1|OPENID-CONNECT|A2A|JSON-SCHEMA|MCP|"
    r"OPENAPI|ISO-\d+|AI-PROTOCOLS|CLTC-AGENTIC|IMDA-AGENTIC|NIST[.\w-]*|XACML"
    r")\]"
)

PROVISIONAL_RE = re.compile(r"63/?\s?985,?186")
BCP14_SENTENCE = (
    "are to be interpreted as described in BCP 14 [RFC2119] [RFC8174] when, "
    "and only when, they appear in all capitals"
)
RFC2119_KEYWORDS = [
    "MUST NOT", "MUST", "REQUIRED", "SHALL NOT", "SHALL", "SHOULD NOT",
    "SHOULD", "NOT RECOMMENDED", "RECOMMENDED", "MAY", "OPTIONAL",
]
ALLCAP_KEYWORD = re.compile(
    r"\b(MUST NOT|MUST|REQUIRED|SHALL NOT|SHALL|SHOULD NOT|SHOULD|"
    r"NOT RECOMMENDED|RECOMMENDED|MAY|OPTIONAL)\b"
)

# Prior-art mechanisms the patent review says to keep in BACKGROUND, with the
# term variants used to detect claim-like usage (Part II.2 of the review).
#
# DPoP / RFC 9449 is intentionally NOT here: it is a legitimately-integrated
# external credential standard (Section 10.3.3 OAuth/DPoP/mTLS), so keyword
# matching only surfaces honest integration (config members, recommendations,
# analogies). The genuine "presentation proof is DPoP-equivalent" claim concern
# is tracked as a patent note, not by this line check.
PRIOR_ART_TERMS = [
    ("OAuth Token Exchange / RFC 8693", re.compile(r"Token[- ]Exchange|\bRFC ?8693\b")),
    ("XACML / NIST.SP.800-162 ABAC", re.compile(r"\bXACML\b|800-162")),
    ("Certificate Transparency / RFC 6962", re.compile(r"Certificate Transparency|\bRFC ?6962\b")),
]

# Lines reviewed as honest prior-art acknowledgment and tracked as patent-filing
# background items (review Part II.2). Matched by a stable substring so that
# editing the surrounding prose produces a fresh flag for re-review.
ACKNOWLEDGED_PRIOR_ART = (
    "conceptually equivalent to OAuth 2.1 Token Exchange",  # Trust delegated reduction
    "transparency-log model",                               # Runtime reserved witness tier (8.8)
)

# Claimable mechanisms (review Part II.1), as keyword probes into Core spec.md.
CLAIMABLE = [
    ("anti-swap version pinning", re.compile(r"anti-swap|version pin", re.I)),
    ("fail-closed governor", re.compile(r"fail[- ]closed", re.I)),
    ("enforcement-evidence record", re.compile(r"enforcement record|enforcement[- ]evidence", re.I)),
    ("persona-vs-delegation split", re.compile(r"\bpersona\b|\bdelegation\b", re.I)),
    ("passport distillation", re.compile(r"\bpassport\b", re.I)),
    ("governed discovery", re.compile(r"governed discovery|front-end of delegation", re.I)),
]


@dataclass
class Finding:
    check: str       # stable ID, e.g. IETF-REF-RESOLVE
    tier: str        # ERROR | WARNING
    message: str
    where: str = ""  # file:line or file


def read(path: Path) -> str:
    return path.read_text(encoding="utf-8") if path.exists() else ""


def strip_code_fences(text: str) -> str:
    out, in_code = [], False
    for line in text.split("\n"):
        if line.strip().startswith("```"):
            in_code = not in_code
            out.append("")
            continue
        out.append("" if in_code else line)
    return "\n".join(out)


def split_section_19(spec: str) -> tuple[str, str]:
    """Return (body-before-19, section-19-text)."""
    m = re.search(r"^## 19\. References", spec, re.M)
    if not m:
        return spec, ""
    return spec[: m.start()], spec[m.start():]


# --------------------------------------------------------------------------- #
# IETF checks
# --------------------------------------------------------------------------- #

def _ref_sets(spec: str) -> tuple[set, set]:
    """Return (defined, cited) reference tokens.

    Defined = tokens on Section 19 definition bullets (`- **[X]** ...`); cited =
    every reference token anywhere else (whole document, code fences stripped, so
    citations in appendices after Section 19 are counted).
    """
    defined: set = set()
    cited: set = set()
    for line in strip_code_fences(spec).split("\n"):
        m = re.match(r"\s*- \*\*\[([A-Za-z0-9.\-]+)\]\*\*", line)
        if m:
            defined.add(m.group(1))
        else:
            cited.update(re.findall(REF_TOKEN, line))
    return defined, cited


def ietf_reference_resolution(spec: str) -> list[Finding]:
    defined, cited = _ref_sets(spec)
    missing = sorted(cited - defined)
    return [Finding("IETF-REF-RESOLVE", "ERROR",
                    f"reference [{t}] is cited but not defined in Section 19",
                    "versions/draft/spec.md") for t in missing]


def ietf_boilerplate_consistency(spec: str, boiler: str) -> list[Finding]:
    body, sec19 = split_section_19(spec)
    s19_norm = set(re.findall(r"\*\*\[(RFC\d+)\]\*\*", sec19.split("### 19.2")[0]))
    info_block = sec19.split("### 19.2")[1] if "### 19.2" in sec19 else ""
    s19_info = set(re.findall(r"\*\*\[([A-Za-z0-9.\-]+)\]\*\*", info_block))
    b_norm = set(re.findall(r"^  (RFC\d+):", boiler, re.M))
    b_all = set(re.findall(r"^  ([A-Z][A-Za-z0-9.\-]+):", boiler, re.M))
    b_info = b_all - b_norm
    out: list[Finding] = []
    for t in sorted(s19_norm ^ b_norm):
        out.append(Finding("IETF-BOILERPLATE-NORMATIVE", "ERROR",
                           f"normative reference {t} differs between Section 19.1 and the kramdown boilerplate",
                           "standardization/templates/ietf-boilerplate.md"))
    for t in sorted(s19_info ^ b_info):
        out.append(Finding("IETF-BOILERPLATE-INFORMATIVE", "ERROR",
                           f"informative reference {t} differs between Section 19.2 and the kramdown boilerplate",
                           "standardization/templates/ietf-boilerplate.md"))
    return out


def ietf_required_sections(spec: str, trust: str, runtime: str) -> list[Finding]:
    out: list[Finding] = []
    core_required = {
        "Requirements Language (RFC 2119)": r"^## 2\. Requirements Language",
        "IANA Considerations": r"^## 17\. IANA",
        "Security Considerations": r"^## 18\. Security Considerations",
        "References 19.1/19.2 split": r"### 19\.1 Normative",
    }
    for label, pat in core_required.items():
        if not re.search(pat, spec, re.M):
            out.append(Finding("IETF-CORE-SECTIONS", "ERROR",
                               f"Core spec is missing required section: {label}",
                               "versions/draft/spec.md"))
    for name, doc, path in (("Trust", trust, "protocol/draft/trust-protocol.md"),
                            ("Runtime", runtime, "protocol/draft/runtime-protocol.md")):
        for label, pat in (("References", r"^#+ .*References"),
                          ("IANA Considerations", r"^#+ .*IANA Considerations"),
                          ("Security Considerations", r"^#+ .*Security Considerations")):
            if not re.search(pat, doc, re.M):
                out.append(Finding("IETF-PROTO-SECTIONS", "ERROR",
                                   f"{name} Protocol is missing required section: {label}", path))
    return out


def ietf_rfc2119_boilerplate(spec: str) -> list[Finding]:
    if BCP14_SENTENCE not in spec:
        return [Finding("IETF-RFC2119-BOILERPLATE", "ERROR",
                        "the canonical RFC 2119/8174 (BCP 14) requirements-language boilerplate is missing",
                        "versions/draft/spec.md")]
    return []


def ietf_docname_consistency(spec: str, boiler: str, manifest: dict, generator: str) -> list[Finding]:
    draft_entry = next((v for v in manifest.get("versions", [])
                        if v.get("status") == "draft"), {})
    names = {
        "manifest ietf_draft": draft_entry.get("ietf_draft", ""),
        "boilerplate docname": (re.search(r"^docname:\s*(\S+)", boiler, re.M) or [None, ""])[1]
        if re.search(r"^docname:\s*(\S+)", boiler, re.M) else "",
        "generator DEFAULT_OUTPUT": (re.search(r'DEFAULT_OUTPUT.*?"([a-z0-9\-]+)\.md"', generator) or [None, ""])[1]
        if re.search(r'DEFAULT_OUTPUT.*?"([a-z0-9\-]+)\.md"', generator) else "",
    }
    vals = {k: v for k, v in names.items() if v}
    if len(set(vals.values())) > 1:
        detail = ", ".join(f"{k}={v}" for k, v in vals.items())
        return [Finding("IETF-DOCNAME", "ERROR",
                        f"the I-D docname is inconsistent across sources: {detail}")]
    return []


def ietf_uncited_references(spec: str) -> list[Finding]:
    defined, cited = _ref_sets(spec)
    unused = sorted(defined - cited)
    return [Finding("IETF-REF-UNUSED", "WARNING",
                    f"reference [{t}] is defined in Section 19 but never cited (idnits unused-reference warning)",
                    "versions/draft/spec.md") for t in unused]


def ietf_xref_sanity(spec: str) -> list[Finding]:
    # Headings/appendices come from the full spec (appendices follow Section 19);
    # in-text references are scanned with code fences stripped.
    headings = set(re.findall(r"^#{2,6}\s+(\d+(?:\.\d+)*)\.?\s", spec, re.M))
    appendices = set(re.findall(r"^## Appendix ([A-Z])\.", spec, re.M))
    body = strip_code_fences(spec)
    out: list[Finding] = []
    for m in re.finditer(r"\bSection\s+(\d+(?:\.\d+)*)", body):
        if "RFC" in body[max(0, m.start() - 12):m.start()]:
            continue
        if m.group(1) not in headings and int(m.group(1).split(".")[0]) <= 18:
            out.append(Finding("IETF-XREF", "WARNING",
                               f'in-text "Section {m.group(1)}" has no matching Core heading',
                               "versions/draft/spec.md"))
    for m in re.finditer(r"\bAppendix\s+([A-Z])\b", body):
        if "RFC" in body[max(0, m.start() - 12):m.start()]:
            continue
        if m.group(1) not in appendices:
            out.append(Finding("IETF-XREF", "WARNING",
                               f'in-text "Appendix {m.group(1)}" has no matching Core appendix',
                               "versions/draft/spec.md"))
    # de-duplicate
    seen, uniq = set(), []
    for f in out:
        if f.message not in seen:
            seen.add(f.message)
            uniq.append(f)
    return uniq


# --------------------------------------------------------------------------- #
# USPTO checks (mechanical consistency + flagging only)
# --------------------------------------------------------------------------- #

def uspto_patent_notice_consistency() -> list[Finding]:
    numbers: dict[str, str] = {}
    for path in PATENT_FILES:
        text = read(path)
        for m in PROVISIONAL_RE.finditer(text):
            norm = re.sub(r"[\s/]", "", m.group(0))  # 63985186
            numbers[str(path.relative_to(REPO_ROOT))] = norm
    distinct = set(numbers.values())
    if len(distinct) > 1:
        detail = ", ".join(f"{k}={v}" for k, v in numbers.items())
        return [Finding("USPTO-NOTICE-CONSISTENCY", "ERROR",
                        f"the provisional application number is inconsistent across editable files: {detail}")]
    return []


def uspto_provisional_reference(spec: str) -> list[Finding]:
    out: list[Finding] = []
    if not re.search(r"\*\*Patent Status:\*\*.*" + PROVISIONAL_RE.pattern, spec):
        out.append(Finding("USPTO-PRIORITY-REF", "ERROR",
                           "spec.md is missing a Patent Status line with a parseable US provisional number",
                           "versions/draft/spec.md"))
    if not (REPO_ROOT / "PATENTS").exists():
        out.append(Finding("USPTO-PATENTS-COVENANT", "ERROR",
                           "the PATENTS non-assertion covenant file is missing"))
    elif not PROVISIONAL_RE.search(read(REPO_ROOT / "README.md")):
        out.append(Finding("USPTO-PATENTS-COVENANT", "WARNING",
                           "README.md does not reference the provisional / patent covenant"))
    return out


def uspto_claimable_sections(spec: str, trust: str, runtime: str) -> list[Finding]:
    combined = "\n".join((spec, trust, runtime))
    return [Finding("USPTO-CLAIMABLE-PRESENT", "WARNING",
                    f"claimable mechanism '{name}' is no longer detectable in the spec/protocol docs "
                    f"(verify it was intentionally removed/relocated)")
            for name, rx in CLAIMABLE if not rx.search(combined)]


def uspto_prior_art_in_claims(spec: str, trust: str, runtime: str) -> list[Finding]:
    out: list[Finding] = []
    for label, doc, path in (("Core", spec, "versions/draft/spec.md"),
                            ("Trust", trust, "protocol/draft/trust-protocol.md"),
                            ("Runtime", runtime, "protocol/draft/runtime-protocol.md")):
        for i, line in enumerate(strip_code_fences(doc).split("\n"), 1):
            if not ALLCAP_KEYWORD.search(line):
                continue
            if any(ack in line for ack in ACKNOWLEDGED_PRIOR_ART):
                continue
            for term, rx in PRIOR_ART_TERMS:
                if rx.search(line):
                    out.append(Finding("USPTO-PRIOR-ART-CLAIM", "WARNING",
                                       f"prior-art mechanism '{term}' appears alongside a normative keyword "
                                       f"(review that this stays BACKGROUND, not claim-like)",
                                       f"{path}:{i}"))
    return out


def uspto_priority_date_leads(spec: str) -> list[Finding]:
    snap = read(PROVISIONAL_SNAPSHOT)
    if not snap:
        return []
    out: list[Finding] = []
    for name, rx in CLAIMABLE:
        if rx.search(spec) and not rx.search(snap):
            out.append(Finding("USPTO-PRIORITY-LEAD", "WARNING",
                               f"claimable mechanism '{name}' appears in the draft but NOT in the "
                               f"2026-02-18 provisional snapshot (versions/0.1.0) -- verify priority before "
                               f"non-provisional conversion"))
    return out


# --------------------------------------------------------------------------- #

def run_all() -> tuple[list[Finding], list[Finding]]:
    spec, boiler, trust, runtime, generator = (
        read(SPEC), read(BOILERPLATE), read(TRUST), read(RUNTIME), read(GENERATOR))
    manifest = yaml.safe_load(read(MANIFEST)) or {}
    ietf = (
        ietf_reference_resolution(spec)
        + ietf_boilerplate_consistency(spec, boiler)
        + ietf_required_sections(spec, trust, runtime)
        + ietf_rfc2119_boilerplate(spec)
        + ietf_docname_consistency(spec, boiler, manifest, generator)
        + ietf_uncited_references(spec)
        + ietf_xref_sanity(spec)
    )
    uspto = (
        uspto_patent_notice_consistency()
        + uspto_provisional_reference(spec)
        + uspto_claimable_sections(spec, trust, runtime)
        + uspto_prior_art_in_claims(spec, trust, runtime)
        + uspto_priority_date_leads(spec)
    )
    return ietf, uspto


def render(ietf: list[Finding], uspto: list[Finding]) -> tuple[str, int]:
    def section(title: str, findings: list[Finding], advisory: bool) -> str:
        errors = [f for f in findings if f.tier == "ERROR"]
        warns = [f for f in findings if f.tier == "WARNING"]
        status = "advisory" if advisory else ("FAIL" if errors else "PASS")
        lines = [f"### {title} — {status}",
                 f"{len(errors)} error(s), {len(warns)} warning(s)\n"]
        if not findings:
            lines.append("All checks passed.\n")
        for f in errors + warns:
            icon = "[ERROR]" if f.tier == "ERROR" else "[warn]"
            loc = f" (`{f.where}`)" if f.where else ""
            lines.append(f"- {icon} `{f.check}` — {f.message}{loc}")
        return "\n".join(lines) + "\n"

    ietf_errors = sum(1 for f in ietf if f.tier == "ERROR")
    parts = [
        "## Standards-readiness report",
        "_Mechanical checks of the editable draft. The USPTO lens is a consistency "
        "and flagging linter for the patent attorney — not a patentability or "
        "priority-date determination._\n",
        f"**IETF: {'FAIL — must fix before merge' if ietf_errors else 'PASS'}** | "
        f"**USPTO: advisory ({sum(1 for f in uspto if f.tier=='WARNING')} note(s))**\n",
        section("IETF (blocking)", ietf, advisory=False),
        section("USPTO (advisory)", uspto, advisory=True),
    ]
    return "\n".join(parts), ietf_errors


def main() -> None:
    ap = argparse.ArgumentParser(description="ADL standards-readiness report")
    ap.add_argument("--output", type=Path, help="write the Markdown report to a file")
    args = ap.parse_args()
    ietf, uspto = run_all()
    report, error_count = render(ietf, uspto)
    if args.output:
        args.output.write_text(report, encoding="utf-8")
    print(report)
    print(f"\nIETF errors: {error_count}", file=sys.stderr)
    sys.exit(error_count)


if __name__ == "__main__":
    main()
