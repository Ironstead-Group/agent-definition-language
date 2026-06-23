#!/usr/bin/env python3
"""
Convert the ADL color diagram SVGs into black-and-white line art suitable for
USPTO patent drawings (37 CFR 1.84(a)(1): black ink, no color/grayscale).

The source SVGs use only presentation attributes (fill=, stroke=) -- no CSS,
classes, gradients, or rasters -- so a context-aware attribute rewrite is exact:

  - Text  -> black fill, no colored stroke.
  - Arrowhead markers -> solid black (fill + stroke black).
  - Filled shapes (rect/circle/ellipse/polygon/path/polyline) -> white fill with a
    black outline, so a former solid-color box reads as a line-drawn box. A black
    stroke is added when the shape had none.
  - Strokes (connectors, lines) -> black.
  - fill="none" is preserved; white/near-white fills stay white.

Color encodes meaning in the originals (red = fail-closed, green = safe); the text
labels carry that meaning into the line art, which is how patent figures convey it.

The canonical color SVGs are left untouched (the site uses them); B&W copies are
written to a separate output directory.

Usage:
  python scripts/svg_to_uspto_bw.py                 # convert the 0.3.0 release set
  python scripts/svg_to_uspto_bw.py --out DIR a.svg b.svg
"""

from __future__ import annotations

import argparse
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
SVG_NS = "http://www.w3.org/2000/svg"

BLACK = "#000000"
WHITE = "#ffffff"
WHITEISH = {"#fff", "#ffffff", "white", "none"}

SHAPES = {"rect", "circle", "ellipse", "polygon", "polyline", "path", "line"}
DEFAULT_SOURCES = [
    REPO / "versions" / "0.3.0" / "diagrams",
    REPO / "protocol" / "0.3.0" / "diagrams",
]


def localname(tag: str) -> str:
    return tag.rsplit("}", 1)[-1] if "}" in tag else tag


def is_whiteish(value: str | None) -> bool:
    return value is not None and value.strip().lower() in WHITEISH


def convert_element(el: ET.Element, in_marker: bool) -> None:
    tag = localname(el.tag)
    here_marker = in_marker or tag == "marker"
    fill = el.get("fill")
    stroke = el.get("stroke")

    # Strokes (connectors, outlines, arrowheads) are always black.
    if stroke is not None and not is_whiteish(stroke):
        el.set("stroke", BLACK)

    # url(...) paint references (markers/patterns) are left as-is; only solid colors convert.
    if fill is not None and not is_whiteish(fill) and not fill.startswith("url("):
        if here_marker:
            # Arrowheads/markers read as solid black, not hollow outlines.
            el.set("fill", BLACK)
        elif tag in SHAPES:
            # A colored solid becomes a white box with a black outline.
            el.set("fill", WHITE)
            if stroke is None or is_whiteish(stroke):
                el.set("stroke", BLACK)
                if "stroke-width" not in el.attrib:
                    el.set("stroke-width", "2")
        else:
            # text/tspan and containers (g/svg/a) -> black; container fill is
            # inherited only by text labels in these diagrams (shapes carry their
            # own fill), so black is the correct, legible choice.
            el.set("fill", BLACK)

    for child in el:
        convert_element(child, here_marker)


def convert_svg(src: Path, dest: Path) -> None:
    ET.register_namespace("", SVG_NS)
    tree = ET.parse(src)
    convert_element(tree.getroot(), in_marker=False)
    dest.parent.mkdir(parents=True, exist_ok=True)
    tree.write(dest, encoding="unicode", xml_declaration=False)
    dest.write_text(dest.read_text(encoding="utf-8") + "\n", encoding="utf-8")


def main() -> None:
    ap = argparse.ArgumentParser(description="Convert ADL diagrams to USPTO black-and-white line art")
    ap.add_argument("svgs", nargs="*", type=Path, help="SVG files (default: the 0.3.0 release diagrams)")
    ap.add_argument("--out", type=Path, default=REPO / "standardization" / "output" / "uspto-bw",
                    help="output directory (default: standardization/output/uspto-bw)")
    args = ap.parse_args()

    if args.svgs:
        sources = args.svgs
    else:
        sources = []
        seen: set[str] = set()
        for d in DEFAULT_SOURCES:
            for svg in sorted(d.glob("*.svg")):
                if svg.name not in seen:  # dedupe shared figures by filename
                    seen.add(svg.name)
                    sources.append(svg)

    if not sources:
        print("no SVGs to convert", file=sys.stderr)
        sys.exit(1)

    for src in sources:
        dest = args.out / src.name
        convert_svg(src, dest)
        print(f"  bw {dest.relative_to(REPO)}")
    print(f"\n{len(sources)} diagram(s) converted to {args.out.relative_to(REPO)}")


if __name__ == "__main__":
    main()
