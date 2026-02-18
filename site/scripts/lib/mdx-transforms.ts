/**
 * MDX transform functions for ADL documentation site.
 *
 * Transforms raw Markdown profile specs into Docusaurus-compatible MDX.
 */

import type { ProfileInfo } from "./manifest";

/**
 * Escape <url> autolinks for MDX compatibility.
 * Converts <https://...> to [url](url).
 */
export function escapeAutolinks(content: string): string {
  return content.replace(/<(https?:\/\/[^>]+)>/g, "[$1]($1)");
}

/**
 * Escape bare < characters that MDX would treat as JSX.
 */
export function escapeHtmlEntities(content: string): string {
  return content.replace(/(?<!`)<(?!\/?\w|!--|https?:\/\/)/g, "&lt;");
}

/**
 * Apply all MDX escaping transforms.
 */
export function applyMdxEscaping(content: string): string {
  content = escapeAutolinks(content);
  content = escapeHtmlEntities(content);
  return content;
}

/**
 * Generate Docusaurus frontmatter for a profile specification page.
 */
export function generateProfileFrontmatter(profile: ProfileInfo): string {
  return `---
id: specification
title: "${profile.title}"
sidebar_position: 2
description: "Full specification for the ADL ${profile.title} including ${profile.description}."
keywords: [${profile.keywords.join(", ")}]
---

`;
}

/**
 * Convert the profile badge lines into a Docusaurus-compatible div table.
 *
 * Converts:
 *   **Identifier:** `urn:adl:profile:governance:1.0`
 *   **Status:** Draft
 *   **ADL Compatibility:** 0.1.x
 *
 * Into a <div className="profile-badge"> with a Markdown table.
 */
export function convertProfileBadge(content: string): string {
  const badgePattern =
    /\*\*Identifier:\*\*\s*`([^`]+)`\n\*\*Status:\*\*\s*(.+)\n\*\*ADL Compatibility:\*\*\s*(.+)/;
  const match = content.match(badgePattern);
  if (!match) return content;

  const [fullMatch, identifier, status, compatibility] = match;
  const badge = `<div className="profile-badge">

| | |
|---|---|
| **Identifier** | \`${identifier}\` |
| **Status** | ${status.trim()} |
| **ADL Compatibility** | ${compatibility.trim()} |

</div>`;

  return content.replace(fullMatch, badge);
}

/**
 * Convert the spec version badge lines into a Docusaurus-compatible div table.
 *
 * Converts:
 *   **Version:** 0.1.0-draft
 *   **Status:** Draft
 *   **Patent Status:** Patent Pending (...)
 *
 * Into a <div className="version-badge"> with a Markdown table.
 * Handles both two-line (Version + Status) and three-line (+ Patent Status) variants.
 */
export function convertVersionBadge(content: string): string {
  const badgePattern =
    /\*\*Version:\*\*\s*(.+)\n\*\*Status:\*\*\s*(.+?)(?:\n\*\*Patent Status:\*\*\s*(.+))?(?=\n\n)/;
  const match = content.match(badgePattern);
  if (!match) return content;

  const [fullMatch, version, status, patentStatus] = match;
  const rows = [
    `| **Version** | \`${version.trim()}\` |`,
    `| **Status** | ${status.trim()} |`,
  ];
  if (patentStatus) {
    rows.push(`| **Patent Status** | ${patentStatus.trim()} |`);
  }

  const badge = `<div className="version-badge">

| | |
|---|---|
${rows.join("\n")}

</div>`;

  return content.replace(fullMatch, badge);
}

/**
 * Convert blockquote admonitions to Docusaurus admonition syntax.
 *
 * Converts:
 *   > **Regulatory Disclaimer:** text
 * To:
 *   :::warning Regulatory Disclaimer
 *   text
 *   :::
 *
 * And:
 *   > **Note:** text
 * To:
 *   :::note
 *   text
 *   :::
 */
export function convertBlockquoteAdmonitions(content: string): string {
  // Handle multi-line blockquotes: collect consecutive > lines
  // Pattern: line starting with > **Keyword:** followed by text, possibly continuing on next > lines
  content = content.replace(
    /^> \*\*Regulatory Disclaimer:\*\*\s*([\s\S]*?)(?=\n(?!>)|$)/gm,
    (_, text) => {
      const cleanText = text.replace(/\n> ?/g, "\n").trim();
      return `:::warning Regulatory Disclaimer\n${cleanText}\n:::`;
    }
  );

  content = content.replace(
    /^> \*\*Note:\*\*\s*([\s\S]*?)(?=\n(?!>)|$)/gm,
    (_, text) => {
      const cleanText = text.replace(/\n> ?/g, "\n").trim();
      return `:::note\n${cleanText}\n:::`;
    }
  );

  return content;
}

/**
 * Wrap the Example section with a Docusaurus info admonition and add
 * a title attribute to the code fence.
 *
 * Finds "## N. Example" and inserts :::info before the code block,
 * and adds title="filename" to the ```json fence.
 */
export function wrapExampleSection(
  content: string,
  exampleFilename: string
): string {
  // Find "## N. Example" header
  const headerPattern = /^## \d+\. Example[ \t]*$/m;
  const headerMatch = content.match(headerPattern);
  if (!headerMatch || headerMatch.index === undefined) return content;

  // Find the ```json code fence after the header
  const afterHeader = content.slice(headerMatch.index);
  const codeFencePattern = /```json\n/;
  const fenceMatch = afterHeader.match(codeFencePattern);
  if (!fenceMatch || fenceMatch.index === undefined) return content;

  const absoluteFenceIndex = headerMatch.index + fenceMatch.index;

  const infoBlock = `:::info Complete Example\nThis example demonstrates a complete agent definition using this profile.\n:::\n\n`;
  const newFence = `\`\`\`json title="${exampleFilename}"\n`;

  return (
    content.slice(0, absoluteFenceIndex) +
    infoBlock +
    newFence +
    content.slice(absoluteFenceIndex + fenceMatch[0].length)
  );
}

/**
 * Wrap the Validation Rules section with a Docusaurus warning admonition.
 *
 * Finds "## N. Validation Rules" and replaces the introductory text
 * with a :::warning admonition block.
 */
export function wrapValidationSection(content: string): string {
  // Find "## N. Validation Rules" header
  const headerPattern = /^(## \d+\. Validation Rules)[ \t]*$/m;
  const headerMatch = content.match(headerPattern);
  if (!headerMatch || headerMatch.index === undefined) return content;

  const headerEnd = headerMatch.index + headerMatch[0].length;

  // Find the introductory text paragraph (between header and the table)
  const afterHeader = content.slice(headerEnd);
  const introPattern = /\n\n([^\n|]+)\n\n/;
  const introMatch = afterHeader.match(introPattern);
  if (!introMatch || introMatch.index === undefined) return content;

  const introStart = headerEnd + introMatch.index + 2; // +2 for \n\n
  const introEnd = introStart + introMatch[1].length;

  const warningBlock = `:::warning Validation Required\nImplementations validating against this profile **MUST** enforce the following rules. Non-conforming documents should be rejected.\n:::`;

  return content.slice(0, introStart) + warningBlock + content.slice(introEnd);
}
