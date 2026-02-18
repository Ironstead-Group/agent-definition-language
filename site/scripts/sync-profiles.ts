/**
 * Sync Profiles Script for ADL Documentation Site
 *
 * Synchronizes profile specifications from profiles/{id}/{version}/profile.md
 * to site/docs/profiles/{id}/specification.md with MDX transforms.
 *
 * Reads profiles/manifest.yaml for profile metadata and applies a transform
 * pipeline to convert raw Markdown profile specs into Docusaurus-compatible MDX.
 *
 * Usage:
 *   npm run sync-profiles              # Sync all profiles
 *   npm run sync-profiles governance   # Sync a single profile
 */

import * as fs from "fs";
import * as path from "path";
import {
  ensureDir,
  readYamlManifest,
  type ProfileManifest,
  type ProfileInfo,
  generateProfileFrontmatter,
  convertProfileBadge,
  convertBlockquoteAdmonitions,
  wrapExampleSection,
  wrapValidationSection,
  applyMdxEscaping,
} from "./lib";

// Paths
const REPO_ROOT = path.resolve(__dirname, "../..");
const PROFILES_DIR = path.join(REPO_ROOT, "profiles");
const SITE_DOCS_PROFILES = path.join(REPO_ROOT, "site", "docs", "profiles");

interface SyncResult {
  profileId: string;
  success: boolean;
  error?: string;
}

/**
 * Apply the full MDX transform pipeline to a profile's Markdown source.
 */
function transformProfile(content: string, profile: ProfileInfo): string {
  // Order matters: structural transforms first, escaping last
  content = convertProfileBadge(content);
  content = convertBlockquoteAdmonitions(content);
  content = wrapExampleSection(content, profile.example_filename);
  content = wrapValidationSection(content);
  content = applyMdxEscaping(content);

  // Prepend frontmatter
  content = generateProfileFrontmatter(profile) + content;

  return content;
}

/**
 * Sync a single profile specification.
 */
function syncProfile(profile: ProfileInfo): SyncResult {
  const result: SyncResult = {
    profileId: profile.id,
    success: false,
  };

  try {
    // Read source profile.md
    const sourcePath = path.join(
      PROFILES_DIR,
      profile.id,
      profile.version,
      "profile.md"
    );
    if (!fs.existsSync(sourcePath)) {
      throw new Error(`Profile source not found: ${sourcePath}`);
    }

    const sourceContent = fs.readFileSync(sourcePath, "utf-8");
    console.log(`  Source: ${path.relative(REPO_ROOT, sourcePath)}`);

    // Apply transform pipeline
    const transformed = transformProfile(sourceContent, profile);

    // Write to site/docs/profiles/{id}/specification.md
    const outputDir = path.join(SITE_DOCS_PROFILES, profile.id);
    ensureDir(outputDir);
    const outputPath = path.join(outputDir, "specification.md");
    fs.writeFileSync(outputPath, transformed);
    console.log(`  Output: ${path.relative(REPO_ROOT, outputPath)}`);

    result.success = true;
  } catch (error) {
    result.error = error instanceof Error ? error.message : String(error);
    console.error(`  Error: ${result.error}`);
  }

  return result;
}

/**
 * Sync profiles README to site docs as the profiles index page.
 * Rewrites links for the Docusaurus site.
 */
function syncProfilesReadme(): boolean {
  const readmePath = path.join(PROFILES_DIR, "README.md");
  if (!fs.existsSync(readmePath)) {
    console.log("No profiles README found");
    return false;
  }

  let content = fs.readFileSync(readmePath, "utf-8");

  // Rewrite ./name/ profile links to site profile pages
  content = content.replace(
    /\[([^\]]+)\]\(\.\/([^/]+)\/\)/g,
    "[$1](/profiles/$2/overview)"
  );

  // Convert blockquote tips to Docusaurus admonitions
  content = content.replace(
    /^> \*\*Tip:\*\*\s*([\s\S]*?)(?=\n(?!>)|$)/gm,
    (_, text: string) => {
      const cleanText = text.replace(/\n> ?/g, "\n").trim();
      return `:::tip When to Use Profiles\n${cleanText}\n:::`;
    }
  );

  // Rewrite spec reference link
  content = content.replace(
    /\[([^\]]+)\]\(\.\.\/versions\/[^)]+#([^)]+)\)/g,
    "[$1](/specification#$2)"
  );

  // Rewrite contributing guide link
  content = content.replace(
    /\[([^\]]+)\]\(\.\.\/CONTRIBUTING\.md\)/g,
    "[$1](/contributing)"
  );

  // Remove the profile proposal template link (not available on site)
  content = content.replace(
    /\[profile proposal template\]\([^)]+\)/g,
    "profile proposal template"
  );

  const outputPath = path.join(SITE_DOCS_PROFILES, "index.md");
  ensureDir(path.dirname(outputPath));
  fs.writeFileSync(outputPath, content);
  console.log(`\nSynced profiles README → docs/profiles/index.md`);
  return true;
}

/**
 * Main sync function
 */
async function main(): Promise<void> {
  console.log("ADL Sync Profiles: Synchronizing profiles to site...\n");

  // Read profile manifest
  const manifestPath = path.join(PROFILES_DIR, "manifest.yaml");
  const manifest = readYamlManifest<ProfileManifest>(manifestPath);
  console.log(`Found ${manifest.profiles.length} profiles in manifest`);

  // Filter to target profile if specified via CLI arg
  const targetId = process.argv[2];
  const profilesToSync = targetId
    ? manifest.profiles.filter((p) => p.id === targetId)
    : manifest.profiles;

  if (targetId && profilesToSync.length === 0) {
    console.error(`Profile "${targetId}" not found in manifest`);
    process.exit(1);
  }

  // Sync each profile
  const results: SyncResult[] = [];
  for (const profile of profilesToSync) {
    console.log(`\nSyncing profile: ${profile.id} v${profile.version} (${profile.status})...`);
    const result = syncProfile(profile);
    results.push(result);
  }

  // Sync profiles README as the index page
  if (!targetId) {
    syncProfilesReadme();
  }

  // Summary
  const successCount = results.filter((r) => r.success).length;
  const failCount = results.filter((r) => !r.success).length;

  console.log(`\nSync complete: ${successCount} profiles synced, ${failCount} failed`);

  if (failCount > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Sync profiles failed:", error);
  process.exit(1);
});
