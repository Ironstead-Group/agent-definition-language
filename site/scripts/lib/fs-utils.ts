/**
 * Shared filesystem utilities for ADL build scripts.
 */

import * as fs from "fs";
import * as path from "path";

/**
 * Ensure directory exists, creating it recursively if needed.
 */
export function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Clean directory contents (remove and recreate).
 */
export function cleanDir(dir: string): void {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true });
  }
  ensureDir(dir);
}

/**
 * Copy directory recursively, returning the number of files copied.
 */
export function copyDir(src: string, dest: string): number {
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
