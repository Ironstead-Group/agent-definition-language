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

// Paths
const REPO_ROOT = path.resolve(__dirname, "../..");
const VERSIONS_DIR = path.join(REPO_ROOT, "versions");
const SITE_ROOT = path.join(REPO_ROOT, "site");
const YAML_SOURCES = path.join(SITE_ROOT, "_yaml-sources");
const DOCS_SPEC = path.join(SITE_ROOT, "docs", "spec");
const VERSIONED_DOCS = path.join(SITE_ROOT, "versioned_docs");

// Types
interface VersionInfo {
  id: string;
  status: "draft" | "rc" | "released" | "deprecated";
  title?: string;
  description?: string;
  released_at?: string;
  superseded_by?: string;
  note?: string;
}

interface Manifest {
  latest: string | null;
  next: string;
  versions: VersionInfo[];
}

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
 * Ensure directory exists
 */
function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Clean directory contents
 */
function cleanDir(dir: string): void {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true });
  }
  ensureDir(dir);
}

/**
 * Copy directory recursively
 */
function copyDir(src: string, dest: string): number {
  let count = 0;
  ensureDir(dest);

  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      count += copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
      count++;
    }
  }

  return count;
}

/**
 * Read and parse the versions manifest
 */
function readManifest(): Manifest {
  const manifestPath = path.join(VERSIONS_DIR, "manifest.yaml");
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Manifest not found: ${manifestPath}`);
  }
  const content = fs.readFileSync(manifestPath, "utf-8");
  return parseYaml(content) as Manifest;
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
  // Find the section header pattern
  const headerPattern = new RegExp(
    `^## ${section.number.replace(/\./g, "\\.")}\\s+${section.title}`,
    "m"
  );

  const match = specContent.match(headerPattern);
  if (!match || match.index === undefined) {
    // Try alternate patterns
    const altPattern = new RegExp(
      `^### ${section.number.replace(/\./g, "\\.")}`,
      "m"
    );
    const altMatch = specContent.match(altPattern);
    if (!altMatch) {
      console.warn(`  Warning: Section ${section.number} ${section.title} not found in spec.md`);
      return `# ${section.title}\n\n*Content pending*\n`;
    }
  }

  const startIndex = match?.index || 0;

  // Find the next section at the same or higher level
  let endIndex = specContent.length;
  const sectionLevel = section.number.split(".").length;

  for (const otherSection of allSections) {
    if (otherSection.id === section.id) continue;

    const otherLevel = otherSection.number.split(".").length;
    if (otherLevel <= sectionLevel) {
      const otherPattern = new RegExp(
        `^## ${otherSection.number.replace(/\./g, "\\.")}\\s`,
        "m"
      );
      const otherMatch = specContent.slice(startIndex + 1).match(otherPattern);
      if (otherMatch && otherMatch.index !== undefined) {
        const possibleEnd = startIndex + 1 + otherMatch.index;
        if (possibleEnd < endIndex && possibleEnd > startIndex) {
          endIndex = possibleEnd;
        }
      }
    }
  }

  let content = specContent.slice(startIndex, endIndex).trim();

  // Convert ## to # for the main heading (Docusaurus expects h1)
  content = content.replace(/^## /, "# ");

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
 * Sync examples from version directory to site
 */
function syncExamples(versionId: string): number {
  const srcDir = path.join(VERSIONS_DIR, versionId, "examples");
  const destDir = path.join(YAML_SOURCES, "examples");

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
 * Sync snippets from version directory to site
 */
function syncSnippets(versionId: string): number {
  const srcDir = path.join(VERSIONS_DIR, versionId, "snippets");
  const destDir = path.join(YAML_SOURCES, "snippets");

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
 * Generate MDX files from spec.md for a version
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

  const specContent = fs.readFileSync(specPath, "utf-8");
  const specManifest = readSpecManifest(versionId);
  const allSections = flattenSections(specManifest.sections);

  ensureDir(outputDir);
  let filesCreated = 0;

  // Generate index/introduction file
  const introSection = specManifest.sections.find(
    (s) => s.id === "introduction"
  );
  if (introSection) {
    const introContent = extractSectionContent(
      specContent,
      introSection,
      allSections
    );
    const introFrontmatter = generateFrontmatter(introSection, 1, versionInfo);

    // Add imports for CodeTabs if needed
    const mdxContent = `${introFrontmatter}
import CodeTabs from '@site/src/components/CodeTabs';

${introContent}
`;

    fs.writeFileSync(path.join(outputDir, "introduction.md"), mdxContent);
    filesCreated++;
  }

  // Generate files for each top-level section
  let position = 2;
  for (const section of specManifest.sections) {
    if (section.id === "introduction") continue;

    const content = extractSectionContent(specContent, section, allSections);
    const frontmatter = generateFrontmatter(section, position, versionInfo);

    // Add imports for CodeTabs
    const mdxContent = `${frontmatter}
import CodeTabs from '@site/src/components/CodeTabs';

${content}
`;

    const filename = `${section.id}.md`;
    fs.writeFileSync(path.join(outputDir, filename), mdxContent);
    filesCreated++;
    position++;
  }

  return filesCreated;
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
    if (isNext || (versionInfo.status === "draft" && !isLatest)) {
      // Draft/next version goes to docs/spec (shown as "Next")
      specOutputDir = DOCS_SPEC;
      console.log(`  Output: docs/spec/ (next version)`);
    } else if (versionInfo.status === "released") {
      // Released versions go to versioned_docs
      specOutputDir = path.join(VERSIONED_DOCS, `version-${versionId}`, "spec");
      console.log(`  Output: versioned_docs/version-${versionId}/spec/`);
    } else {
      // RC or other statuses - treat as next for now
      specOutputDir = DOCS_SPEC;
      console.log(`  Output: docs/spec/`);
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
    }

    // Generate spec MDX files
    // Note: For now, we skip auto-generation and preserve manually crafted MDX
    // Uncomment the following to enable auto-generation from spec.md:
    // const specFilesCount = generateSpecDocs(versionId, versionInfo, specOutputDir);
    // console.log(`  Generated ${specFilesCount} spec files`);
    // result.filesCreated += specFilesCount;

    console.log(`  Skipping spec MDX generation (preserving manual MDX files)`);
    console.log(`  To enable auto-generation, edit sync-spec.ts`);

    result.success = true;
  } catch (error) {
    result.error = error instanceof Error ? error.message : String(error);
    console.error(`  Error: ${result.error}`);
  }

  return result;
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

  // Generate versions.json for Docusaurus
  generateVersionsJson(manifest);

  // Summary
  const successCount = results.filter((r) => r.success).length;
  const failCount = results.filter((r) => !r.success).length;
  const totalFiles = results.reduce((sum, r) => sum + r.filesCreated, 0);

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
