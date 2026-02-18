#!/usr/bin/env bun

/**
 * Build standalone binaries for all platforms using `bun build --compile`.
 */

import { $ } from "bun";
import * as path from "node:path";
import * as fs from "node:fs";

const ROOT = path.resolve(import.meta.dir, "..");
const ENTRY = path.join(ROOT, "src/index.ts");
const DIST = path.join(ROOT, "dist");

const TARGETS = [
  { target: "bun-linux-x64", output: "adl-linux-x64" },
  { target: "bun-linux-arm64", output: "adl-linux-arm64" },
  { target: "bun-darwin-x64", output: "adl-darwin-x64" },
  { target: "bun-darwin-arm64", output: "adl-darwin-arm64" },
  { target: "bun-windows-x64", output: "adl-windows-x64.exe" },
];

async function main() {
  fs.mkdirSync(DIST, { recursive: true });

  console.log("Building standalone binaries...\n");

  for (const { target, output } of TARGETS) {
    const outPath = path.join(DIST, output);
    console.log(`  ${target} → ${output}`);

    try {
      await $`bun build --compile --target=${target} ${ENTRY} --outfile ${outPath}`.quiet();
      console.log(`    ✓ ${output}`);
    } catch (err) {
      console.error(`    ✗ ${output}: ${err}`);
    }
  }

  console.log("\nDone.");
}

main();
