import React from "react";

interface DiagramProps {
  /**
   * Resolved SVG URL. In .mdx, pass a relative import so the asset
   * version-pins, e.g. `import url from '../diagrams/foo.svg'`.
   */
  src: string;
  /** Required alt text for accessibility. */
  alt: string;
  /** Optional caption shown beneath the diagram. */
  caption?: string;
  /** Optional explicit width (px number or CSS string). */
  width?: number | string;
}

/**
 * Diagram renders a version-pinned SVG inside a white card (readable in dark
 * mode) with an optional caption. Use in .mdx docs:
 *
 *   import Diagram from '@site/src/components/Diagram';
 *   import flow from '../diagrams/foo.svg';
 *   <Diagram src={flow} alt="…" caption="…" />
 *
 * For .md (CommonMark) docs, use a plain markdown image instead:
 *   ![alt](../diagrams/foo.svg)
 */
export default function Diagram({
  src,
  alt,
  caption,
  width,
}: DiagramProps): React.ReactElement {
  return (
    <figure className="adl-diagram">
      <img src={src} alt={alt} style={width ? { width } : undefined} />
      {caption ? <figcaption>{caption}</figcaption> : null}
    </figure>
  );
}
