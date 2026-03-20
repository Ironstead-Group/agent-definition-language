#!/usr/bin/env bun

/**
 * Workspace-level version manager for ADL packages.
 *
 * All publishable packages share the same version, aligned to the spec:
 *   - major.minor matches the latest released spec version
 *   - patch increments for updates within a spec version
 *
 * Usage:
 *   bun run scripts/bump-versions.ts sync      # align all packages to latest spec version (e.g., 0.2.0)
 *   bun run scripts/bump-versions.ts patch      # bump patch on all packages (0.2.0 → 0.2.1)
 *   bun run scripts/bump-versions.ts 0.3.0      # set explicit version on all packages
 */

import { $ } from "bun";
import * as fs from "node:fs";
import * as path from "node:path";
import YAML from "yaml";

const ROOT = path.resolve(import.meta.dir, "..");
const MANIFEST_PATH = path.join(ROOT, "versions/manifest.yaml");

// Packages that get published and must share a version
const PUBLISHABLE_PACKAGES = ["adl-core", "adl-generator", "adl-cli"];

interface Manifest {
  latest: string;
  versions: { id: string; status: string }[];
}

function parseVersion(version: string): [number, number, number] {
  const parts = version.split(".").map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) {
    throw new Error(`Invalid version: ${version}`);
  }
  return parts as [number, number, number];
}

function getSpecVersion(): string {
  const manifest: Manifest = YAML.parse(
    fs.readFileSync(MANIFEST_PATH, "utf-8")
  );
  return manifest.latest;
}

function getCurrentVersion(): string {
  // Read from core as the source of truth
  const pkg = JSON.parse(
    fs.readFileSync(
      path.join(ROOT, "packages/adl-core/package.json"),
      "utf-8"
    )
  );
  return pkg.version;
}

function resolveNextVersion(arg: string): string {
  const current = getCurrentVersion();
  const specVersion = getSpecVersion();
  const [specMajor, specMinor] = parseVersion(specVersion);

  switch (arg) {
    case "sync": {
      // Align to spec: set to <specMajor>.<specMinor>.0
      return `${specMajor}.${specMinor}.0`;
    }
    case "patch": {
      const [curMajor, curMinor, curPatch] = parseVersion(current);
      if (curMajor !== specMajor || curMinor !== specMinor) {
        console.error(
          `Current version ${current} does not match spec ${specVersion}. Run 'sync' first.`
        );
        process.exit(1);
      }
      return `${curMajor}.${curMinor}.${curPatch + 1}`;
    }
    default: {
      // Explicit version — validate it aligns with spec
      const [maj, min] = parseVersion(arg);
      if (maj !== specMajor || min !== specMinor) {
        console.error(
          `Version ${arg} does not align with spec version ${specVersion} (major.minor must match).`
        );
        process.exit(1);
      }
      return arg;
    }
  }
}

function updatePackageJson(pkgDir: string, version: string): void {
  const pkgPath = path.join(ROOT, "packages", pkgDir, "package.json");
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
  pkg.version = version;
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
}

function updateCliVersionString(nextVersion: string): void {
  const indexPath = path.join(ROOT, "packages/adl-cli/src/index.ts");
  const src = fs.readFileSync(indexPath, "utf-8");
  const updated = src.replace(
    /\.version\("[^"]+"\)/,
    `.version("${nextVersion}")`
  );
  if (updated !== src) {
    fs.writeFileSync(indexPath, updated);
    console.log(`  ✓ packages/adl-cli/src/index.ts`);
  }
}

async function main() {
  const arg = process.argv[2];
  if (!arg) {
    console.error("Usage: bump-versions.ts <sync|patch|x.y.z>");
    process.exit(1);
  }

  const current = getCurrentVersion();
  const next = resolveNextVersion(arg);
  const specVersion = getSpecVersion();

  console.log(`Spec version:    ${specVersion}`);
  console.log(`Current version: ${current}`);
  console.log(`Next version:    ${next}\n`);

  if (current === next) {
    console.log("All packages already at target version, nothing to do.");
    return;
  }

  // Update all publishable packages
  for (const dir of PUBLISHABLE_PACKAGES) {
    updatePackageJson(dir, next);
    console.log(`  ✓ packages/${dir}/package.json`);
  }

  // Update CLI version string in source
  updateCliVersionString(next);

  // Sync lockfile
  await $`bun install`.quiet().cwd(ROOT);
  console.log(`  ✓ bun.lock`);

  console.log(`\nDone. All packages now at ${next}.`);
}

main();
