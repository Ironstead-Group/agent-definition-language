/**
 * Manifest types and YAML reader for ADL build scripts.
 */

import * as fs from "fs";
import { parse as parseYaml } from "yaml";

// --- Version manifest types (used by sync-spec.ts) ---

export interface VersionInfo {
  id: string;
  status: "draft" | "rc" | "released" | "deprecated";
  title?: string;
  description?: string;
  released_at?: string;
  superseded_by?: string;
  note?: string;
}

export interface VersionManifest {
  latest: string | null;
  next: string;
  versions: VersionInfo[];
}

// --- Profile manifest types (used by sync-profiles.ts) ---

export interface ProfileInfo {
  id: string;
  version: string;
  status: "draft" | "rc" | "released" | "deprecated";
  title: string;
  description: string;
  adl_compatibility: string;
  overview: string;
  keywords: string[];
  example_filename: string;
}

export interface ProfileManifest {
  profiles: ProfileInfo[];
}

/**
 * Read and parse a YAML manifest file.
 */
export function readYamlManifest<T>(manifestPath: string): T {
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Manifest not found: ${manifestPath}`);
  }
  const content = fs.readFileSync(manifestPath, "utf-8");
  return parseYaml(content) as T;
}
