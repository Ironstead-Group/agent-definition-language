/**
 * Sync Spec Script for ADL Documentation Site
 *
 * Synchronizes content from versions/ to site/:
 * 1. Reads versions/manifest.yaml for version metadata
 * 2. Copies examples and snippets to site/_yaml-sources/
 * 3. Splits spec.md into individual MDX files for Docusaurus
 * 4. Manages Docusaurus versioned_docs for released versions
 *
 * Usage:
 *   npm run sync-spec           # Sync all versions
 *   npm run sync-spec 0.2.0     # Sync specific version
 */

import * as fs from "fs";
import * as path from "path";
import { parse as parseYaml } from "yaml";
import {
  ensureDir,
  cleanDir,
  copyDir,
  readYamlManifest,
  type VersionInfo,
  type VersionManifest,
} from "./lib";

// Paths
const REPO_ROOT = path.resolve(__dirname, "../..");
const VERSIONS_DIR = path.join(REPO_ROOT, "versions");
const SITE_ROOT = path.join(REPO_ROOT, "site");
const YAML_SOURCES = path.join(SITE_ROOT, "_yaml-sources");
const DOCS_SPEC = path.join(SITE_ROOT, "docs", "spec");
const VERSIONED_DOCS = path.join(SITE_ROOT, "versioned_docs");

// Re-type Manifest as VersionManifest for local use
type Manifest = VersionManifest;

interface Section {
  id: string;
  number: string;
  title: string;
  level?: number;
  subsections?: Section[];
}

interface SpecManifest {
  version: string;
  source: string;
  schema: string;
  sections: Section[];
}

interface SyncResult {
  version: string;
  success: boolean;
  filesCreated: number;
  error?: string;
}

/**
 * Read and parse the versions manifest
 */
function readManifest(): Manifest {
  return readYamlManifest<Manifest>(path.join(VERSIONS_DIR, "manifest.yaml"));
}

/**
 * Read and parse a version's spec-manifest.yaml
 */
function readSpecManifest(versionId: string): SpecManifest {
  const manifestPath = path.join(
    VERSIONS_DIR,
    versionId,
    "spec-manifest.yaml"
  );
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Spec manifest not found: ${manifestPath}`);
  }
  const content = fs.readFileSync(manifestPath, "utf-8");
  return parseYaml(content) as SpecManifest;
}

/**
 * Generate Docusaurus frontmatter for a section
 */
function generateFrontmatter(
  section: Section,
  sidebarPosition: number,
  versionInfo: VersionInfo
): string {
  const statusBadge =
    versionInfo.status === "draft"
      ? "Draft"
      : versionInfo.status === "rc"
        ? "Release Candidate"
        : versionInfo.status === "released"
          ? "Released"
          : "Deprecated";

  return `---
id: ${section.id}
title: "${section.number}. ${section.title}"
sidebar_position: ${sidebarPosition}
description: ADL Specification - ${section.title}
keywords: [adl, specification, ${section.id.replace(/-/g, ", ")}]
---
`;
}

/**
 * Extract section content from spec.md
 */
function extractSectionContent(
  specContent: string,
  section: Section,
  allSections: Section[]
): string {
  const escapedNumber = section.number.replace(/\./g, "\\.");
  const escapedTitle = section.title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  // Try multiple header patterns to find the section
  // Spec uses "## N. Title" (dot after number) or "## Appendix A. Title"
  const patterns = [
    new RegExp(`^## ${escapedNumber}\\.?\\s+${escapedTitle}`, "m"),
    new RegExp(`^## Appendix ${escapedNumber}\\.?\\s+${escapedTitle}`, "m"),
    new RegExp(`^## ${escapedNumber}[.\\s]`, "m"),
    new RegExp(`^## Appendix ${escapedNumber}[.\\s]`, "m"),
  ];

  let startIndex: number | undefined;
  for (const pattern of patterns) {
    const m = specContent.match(pattern);
    if (m && m.index !== undefined) {
      startIndex = m.index;
      break;
    }
  }

  if (startIndex === undefined) {
    console.warn(`  Warning: Section ${section.number} ${section.title} not found in spec.md`);
    return `# ${section.title}\n\n*Content pending*\n`;
  }

  // Find the next top-level section (## N. or ## Appendix) after this one
  let endIndex = specContent.length;

  // Match any top-level section header: "## N." or "## Appendix"
  const nextSectionPattern = /^## (?:\d+|Appendix [A-Z])[.\s]/gm;
  nextSectionPattern.lastIndex = startIndex + 1;
  let nextMatch: RegExpExecArray | null;
  while ((nextMatch = nextSectionPattern.exec(specContent)) !== null) {
    if (nextMatch.index > startIndex) {
      endIndex = nextMatch.index;
      break;
    }
  }

  let content = specContent.slice(startIndex, endIndex).trim();

  // Convert ## to # for the main heading (Docusaurus expects h1)
  content = content.replace(/^## /, "# ");
  // Remove "Appendix " prefix from heading if present (e.g. "# Appendix A. JSON Schema" -> "# JSON Schema")
  content = content.replace(/^# Appendix [A-Z]\.\s*/, "# ");

  // Escape <url> autolinks for MDX compatibility: <https://...> -> [url](url)
  content = content.replace(/<(https?:\/\/[^>]+)>/g, "[$1]($1)");

  // Escape HTML-like entities that MDX treats as JSX (e.g. &lt; in tables)
  // These are already escaped in spec.md but MDX may still choke on bare < in some contexts
  content = content.replace(/(?<!`)<(?!\/?\w|!--|https?:\/\/)/g, "&lt;");

  // Rewrite repo-relative links to work within the Docusaurus site
  // ./examples/name.yaml -> /examples/name (site example pages)
  // ../../profiles/ -> /profiles/
  // ./schema.json -> reference to schema appendix
  content = content.replace(
    /\[([^\]]+)\]\(\.\/examples\/([^)]+)\.yaml\)/g,
    "[$1](/examples/$2)"
  );
  content = content.replace(
    /\[([^\]]+)\]\(\.\.\/\.\.\/profiles\/([^)]*)\)/g,
    (_match, text, rest) => `[${text}](/profiles/${rest || ""})`
  );
  content = content.replace(
    /\[([^\]]+)\]\(\.\/schema\.json\)/g,
    "[$1](https://github.com/Ironstead-Group/agent-definition-language/blob/main/versions/0.1.0/schema.json)"
  );

  return content;
}

/**
 * Get all sections flattened (for finding next section)
 */
function flattenSections(sections: Section[]): Section[] {
  const flat: Section[] = [];
  for (const section of sections) {
    flat.push(section);
    if (section.subsections) {
      flat.push(...flattenSections(section.subsections));
    }
  }
  return flat;
}

/**
 * Sync examples from version directory to site (version-scoped)
 * Examples go to _yaml-sources/{versionId}/examples/
 */
function syncExamples(versionId: string): number {
  const srcDir = path.join(VERSIONS_DIR, versionId, "examples");
  const destDir = path.join(YAML_SOURCES, versionId, "examples");

  if (!fs.existsSync(srcDir)) {
    console.log(`  No examples found for version ${versionId}`);
    return 0;
  }

  // Clear destination to remove stale files from renamed/deleted sources
  if (fs.existsSync(destDir)) {
    fs.rmSync(destDir, { recursive: true });
  }
  ensureDir(destDir);
  return copyDir(srcDir, destDir);
}

/**
 * Sync examples README to site docs as the examples index page.
 * Rewrites links for the Docusaurus site.
 */
function syncExamplesReadme(versionId: string): boolean {
  const readmePath = path.join(VERSIONS_DIR, versionId, "examples", "README.md");
  if (!fs.existsSync(readmePath)) {
    console.log(`  No examples README found for version ${versionId}`);
    return false;
  }

  let content = fs.readFileSync(readmePath, "utf-8");

  // Rewrite ./name.yaml links to site example pages
  content = content.replace(
    /\[([^\]]+)\]\(\.\/([^)]+)\.yaml\)/g,
    "[$1](/examples/$2)"
  );

  // Convert blockquote tips to Docusaurus admonitions
  content = content.replace(
    /^> \*\*Tip:\*\*\s*([\s\S]*?)(?=\n(?!>)|$)/gm,
    (_, text) => {
      const cleanText = text.replace(/\n> ?/g, "\n").trim();
      return `:::tip Start Here\n${cleanText}\n:::`;
    }
  );

  // Convert blockquote notes to Docusaurus admonitions
  content = content.replace(
    /^> \*\*Note:\*\*\s*([\s\S]*?)(?=\n(?!>)|$)/gm,
    (_, text) => {
      const cleanText = text.replace(/\n> ?/g, "\n").trim();
      return `:::info File Extension\n${cleanText}\n:::`;
    }
  );

  // Rewrite contributing guide link
  content = content.replace(
    /\[([^\]]+)\]\(\.\.\/\.\.\/\.\.\/CONTRIBUTING\.md\)/g,
    "[$1](/contributing)"
  );

  const outputPath = path.join(SITE_ROOT, "docs", "examples", "index.md");
  ensureDir(path.dirname(outputPath));
  fs.writeFileSync(outputPath, content);
  console.log(`  Synced examples README → docs/examples/index.md`);
  return true;
}

/**
 * Sync snippets from version directory to site (version-scoped)
 * Snippets go to _yaml-sources/{versionId}/snippets/
 */
function syncSnippets(versionId: string): number {
  const srcDir = path.join(VERSIONS_DIR, versionId, "snippets");
  const destDir = path.join(YAML_SOURCES, versionId, "snippets");

  if (!fs.existsSync(srcDir)) {
    console.log(`  No snippets found for version ${versionId}`);
    return 0;
  }

  // Clear destination to remove stale files from renamed/deleted sources
  if (fs.existsSync(destDir)) {
    fs.rmSync(destDir, { recursive: true });
  }
  ensureDir(destDir);
  return copyDir(srcDir, destDir);
}

/**
 * Generate a single specification MDX file from spec.md
 */
function generateSpecDocs(
  versionId: string,
  versionInfo: VersionInfo,
  outputDir: string
): number {
  const specPath = path.join(VERSIONS_DIR, versionId, "spec.md");
  if (!fs.existsSync(specPath)) {
    throw new Error(`Spec not found: ${specPath}`);
  }

  let specContent = fs.readFileSync(specPath, "utf-8");

  // Escape <url> autolinks for MDX compatibility: <https://...> -> [url](url)
  specContent = specContent.replace(/<(https?:\/\/[^>]+)>/g, "[$1]($1)");

  // Escape HTML-like entities that MDX treats as JSX
  specContent = specContent.replace(/(?<!`)<(?!\/?\w|!--|https?:\/\/|a\s)/g, "&lt;");

  // Rewrite repo-relative links to site example pages
  specContent = specContent.replace(
    /\[([^\]]+)\]\(\.\/examples\/([^)]+)\.yaml\)/g,
    "[$1](/examples/$2)"
  );
  specContent = specContent.replace(
    /\[([^\]]+)\]\(\.\.\/\.\.\/profiles\/([^)]*)\)/g,
    (_match, text, rest) => `[${text}](/profiles/${rest || ""})`
  );
  specContent = specContent.replace(
    /\[([^\]]+)\]\(\.\/schema\.json\)/g,
    "[$1](https://github.com/Ironstead-Group/agent-definition-language/blob/main/versions/0.1.0/schema.json)"
  );

  // Remove the "# Agent Definition Language" h1 title if present (frontmatter provides the title)
  specContent = specContent.replace(/^# Agent Definition Language[^\n]*\n+/, "");

  // Build frontmatter
  const statusLabel =
    versionInfo.status === "draft"
      ? "Draft"
      : versionInfo.status === "rc"
        ? "Release Candidate"
        : versionInfo.status === "released"
          ? "Released"
          : "Deprecated";

  const frontmatter = `---
id: specification
title: "Agent Definition Language Specification"
description: "ADL Specification v${versionId} (${statusLabel})"
keywords: [adl, specification, agent, definition, language]
toc_max_heading_level: 3
hide_table_of_contents: false
---

import CodeTabs from '@site/src/components/CodeTabs';

`;

  // Ensure output directory exists
  ensureDir(outputDir);

  // Remove old split files if they exist in a spec/ subdirectory
  const oldSpecDir = path.join(outputDir, "spec");
  if (fs.existsSync(oldSpecDir)) {
    fs.rmSync(oldSpecDir, { recursive: true });
    console.log("  Removed old split spec files");
  }

  // Write single specification file
  const outputPath = path.join(outputDir, "specification.md");
  fs.writeFileSync(outputPath, frontmatter + specContent);

  return 1;
}

/**
 * Generate versions.json for Docusaurus
 */
function generateVersionsJson(manifest: Manifest): void {
  const releasedVersions = manifest.versions
    .filter((v) => v.status === "released")
    .map((v) => v.id)
    .sort((a, b) => {
      // Sort by semver descending
      const [aMajor, aMinor, aPatch] = a.split(".").map(Number);
      const [bMajor, bMinor, bPatch] = b.split(".").map(Number);
      if (aMajor !== bMajor) return bMajor - aMajor;
      if (aMinor !== bMinor) return bMinor - aMinor;
      return bPatch - aPatch;
    });

  if (releasedVersions.length > 0) {
    const versionsPath = path.join(SITE_ROOT, "versions.json");
    fs.writeFileSync(versionsPath, JSON.stringify(releasedVersions, null, 2));
    console.log(`Generated versions.json with ${releasedVersions.length} versions`);
  }
}

/**
 * Sync a single version
 */
function syncVersion(versionId: string, manifest: Manifest): SyncResult {
  const result: SyncResult = {
    version: versionId,
    success: false,
    filesCreated: 0,
  };

  try {
    const versionInfo = manifest.versions.find((v) => v.id === versionId);
    if (!versionInfo) {
      throw new Error(`Version ${versionId} not found in manifest`);
    }

    console.log(`\nSyncing version ${versionId} (${versionInfo.status})...`);

    // Determine output directory based on version status
    const isNext = manifest.next === versionId;
    const isLatest = manifest.latest === versionId;

    let specOutputDir: string;
    const docsDir = path.join(SITE_ROOT, "docs");
    if (isNext || (versionInfo.status === "draft" && !isLatest)) {
      // Draft/next version goes to docs/ as single file
      specOutputDir = docsDir;
      console.log(`  Output: docs/specification.md (next version)`);
    } else if (versionInfo.status === "released") {
      // Released versions go to versioned_docs
      specOutputDir = path.join(VERSIONED_DOCS, `version-${versionId}`);
      console.log(`  Output: versioned_docs/version-${versionId}/specification.md`);
    } else {
      // RC or other statuses - treat as next for now
      specOutputDir = docsDir;
      console.log(`  Output: docs/specification.md`);
    }

    // Sync examples (always to _yaml-sources for current working version)
    if (isNext) {
      const examplesCount = syncExamples(versionId);
      console.log(`  Synced ${examplesCount} example files`);
      result.filesCreated += examplesCount;

      // Sync snippets
      const snippetsCount = syncSnippets(versionId);
      console.log(`  Synced ${snippetsCount} snippet files`);
      result.filesCreated += snippetsCount;

      // Sync examples README as site index page
      if (syncExamplesReadme(versionId)) {
        result.filesCreated += 1;
      }
    }

    // Generate spec MDX files from spec.md (source of truth)
    const specFilesCount = generateSpecDocs(versionId, versionInfo, specOutputDir);
    console.log(`  Generated ${specFilesCount} spec files`);
    result.filesCreated += specFilesCount;

    result.success = true;
  } catch (error) {
    result.error = error instanceof Error ? error.message : String(error);
    console.error(`  Error: ${result.error}`);
  }

  return result;
}

/**
 * Sync JSON Schema to site/static for hosting
 *
 * Copies the canonical schema.json and generates a draft-07 version
 * for IDE IntelliSense (VS Code only fully supports draft-07).
 */
function syncSchema(versionId: string): number {
  const schemaPath = path.join(VERSIONS_DIR, versionId, "schema.json");
  if (!fs.existsSync(schemaPath)) {
    console.log(`  No schema.json found for version ${versionId}`);
    return 0;
  }

  // Derive the short version path (e.g., "0.1.0" -> "0.1")
  const parts = versionId.split(".");
  const shortVersion = `${parts[0]}.${parts[1]}`;
  const staticDir = path.join(SITE_ROOT, "static", shortVersion);
  ensureDir(staticDir);

  let count = 0;

  // Copy canonical schema (2020-12)
  const destSchema = path.join(staticDir, "schema.json");
  fs.copyFileSync(schemaPath, destSchema);
  console.log(`  Copied schema.json → static/${shortVersion}/schema.json`);
  count++;

  // Generate draft-07 version for IDE IntelliSense
  const schemaContent = JSON.parse(fs.readFileSync(schemaPath, "utf-8"));
  schemaContent["$schema"] = "http://json-schema.org/draft-07/schema#";
  const destDraft07 = path.join(staticDir, "schema-draft07.json");
  fs.writeFileSync(destDraft07, JSON.stringify(schemaContent, null, 2) + "\n");
  console.log(`  Generated schema-draft07.json → static/${shortVersion}/schema-draft07.json`);
  count++;

  return count;
}

/**
 * Main sync function
 */
async function main(): Promise<void> {
  console.log("ADL Sync Spec: Synchronizing versions to site...\n");

  // Read manifest
  const manifest = readManifest();
  console.log(`Found ${manifest.versions.length} versions in manifest`);
  console.log(`  Latest: ${manifest.latest || "(none)"}`);
  console.log(`  Next: ${manifest.next}`);

  // Get version to sync from command line args
  const targetVersion = process.argv[2];
  const versionsToSync = targetVersion
    ? [targetVersion]
    : manifest.versions.map((v) => v.id);

  // Sync versions
  const results: SyncResult[] = [];
  for (const versionId of versionsToSync) {
    const result = syncVersion(versionId, manifest);
    results.push(result);
  }

  // Sync schemas to static/ for hosting
  let schemaCount = 0;
  for (const versionId of versionsToSync) {
    schemaCount += syncSchema(versionId);
  }
  console.log(`\nSynced ${schemaCount} schema files to static/`);

  // Generate versions.json for Docusaurus
  generateVersionsJson(manifest);

  // Summary
  const successCount = results.filter((r) => r.success).length;
  const failCount = results.filter((r) => !r.success).length;
  const totalFiles = results.reduce((sum, r) => sum + r.filesCreated, 0) + schemaCount;

  console.log(`\nSync complete: ${successCount} versions synced, ${failCount} failed`);
  console.log(`Total files: ${totalFiles}`);

  if (failCount > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Sync failed:", error);
  process.exit(1);
});
