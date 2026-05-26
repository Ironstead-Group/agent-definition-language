/**
 * Spec version bridge: populate Docusaurus versioned docs from versions/.
 *
 * Reads versions/manifest.yaml and copies each released version directory
 * into spec_versioned_docs/version-{id}/ so the docs plugin can find them.
 * Also generates spec_versions.json and versioned sidebar files.
 *
 * This eliminates duplication — versions/{id}/ is the single source of truth,
 * and spec_versioned_docs/ is ephemeral build output (gitignored).
 *
 * Must be called synchronously at config evaluation time (before plugins init).
 */

import * as fs from 'fs';
import * as path from 'path';

interface VersionEntry {
  id: string;
  status: string;
  label: string;
  released_at?: string;
  ietf_draft?: string;
}

interface VersionManifest {
  latest: string;
  next: string;
  versions: VersionEntry[];
}

function parseManifest(manifestPath: string): VersionManifest {
  // Minimal YAML parser for the simple manifest structure.
  // Avoids adding a runtime dependency — the manifest is a flat list.
  const text = fs.readFileSync(manifestPath, 'utf-8');
  const lines = text.split('\n');

  let latest = '';
  let next = '';
  const versions: VersionEntry[] = [];
  let current: Partial<VersionEntry> | null = null;

  for (const line of lines) {
    const latestMatch = line.match(/^latest:\s*"(.+)"/);
    if (latestMatch) {
      latest = latestMatch[1];
      continue;
    }

    const nextMatch = line.match(/^next:\s*"(.+)"/);
    if (nextMatch) {
      next = nextMatch[1];
      continue;
    }

    if (line.trim() === '- id:' || line.match(/^\s+-\s+id:/)) {
      if (current?.id) versions.push(current as VersionEntry);
      const idMatch = line.match(/id:\s*"(.+)"/);
      current = {id: idMatch?.[1] ?? ''};
      continue;
    }

    if (current) {
      const statusMatch = line.match(/^\s+status:\s*(\S+)/);
      if (statusMatch) {
        current.status = statusMatch[1];
        continue;
      }
      const labelMatch = line.match(/^\s+label:\s*"(.+)"/);
      if (labelMatch) {
        current.label = labelMatch[1];
        continue;
      }
      const releasedMatch = line.match(/^\s+released_at:\s*"(.+)"/);
      if (releasedMatch) {
        current.released_at = releasedMatch[1];
        continue;
      }
      const ietfMatch = line.match(/^\s+ietf_draft:\s*"(.+)"/);
      if (ietfMatch) {
        current.ietf_draft = ietfMatch[1];
        continue;
      }
    }
  }

  if (current?.id) versions.push(current as VersionEntry);

  return {latest, next, versions};
}

function copyDirSync(src: string, dest: string): void {
  fs.mkdirSync(dest, {recursive: true});
  for (const entry of fs.readdirSync(src, {withFileTypes: true})) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function loadSidebar(siteDir: string): object {
  // Import the live sidebarsSpec.ts so versioned sidebars stay in sync.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const sidebarsSpec = require(path.join(siteDir, 'sidebarsSpec.ts'));
  return sidebarsSpec.default ?? sidebarsSpec;
}

/**
 * Walk a version's doc directory and return the set of doc ids that exist.
 * Doc id resolution follows Docusaurus convention: either the frontmatter
 * `id:` or the path-derived basename (folder/filename-without-ext for nested
 * files, filename-without-ext for top-level files).
 */
function listDocIds(rootDir: string): Set<string> {
  const ids = new Set<string>();
  if (!fs.existsSync(rootDir)) return ids;

  function walk(dir: string, prefix: string): void {
    for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
      const full = path.join(dir, entry.name);
      const next = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        walk(full, next);
      } else if (entry.name.endsWith('.md') || entry.name.endsWith('.mdx')) {
        const content = fs.readFileSync(full, 'utf-8');
        const idMatch = content.match(/^---[\s\S]*?\nid:\s*(\S+)/);
        const baseName = entry.name.replace(/\.(md|mdx)$/, '');
        const explicitId = idMatch?.[1];
        const fullId = prefix
          ? explicitId
            ? `${prefix}/${explicitId}`
            : `${prefix}/${baseName}`
          : explicitId ?? baseName;
        ids.add(fullId);
      }
    }
  }
  walk(rootDir, '');
  return ids;
}

interface SidebarItem {
  type?: string;
  id?: string;
  items?: unknown[];
  link?: {type?: string; id?: string};
  [k: string]: unknown;
}

/**
 * Filter a single sidebar item, returning the item or null if it references a
 * doc id not present in `validIds`. Categories whose link or items all
 * evaporate are dropped. Non-doc items (external links, refs) are kept.
 */
function filterSidebarItem(
  item: unknown,
  validIds: Set<string>,
): unknown | null {
  if (item === null || item === undefined) return null;
  if (typeof item === 'string') {
    return validIds.has(item) ? item : null;
  }
  if (typeof item !== 'object') return item;

  const obj = item as SidebarItem;

  if (obj.type === 'doc') {
    return typeof obj.id === 'string' && validIds.has(obj.id) ? obj : null;
  }

  if (obj.type === 'category') {
    const filteredItems = Array.isArray(obj.items)
      ? (obj.items
          .map((sub) => filterSidebarItem(sub, validIds))
          .filter((sub) => sub !== null) as unknown[])
      : [];
    const linkValid =
      !obj.link ||
      obj.link.type !== 'doc' ||
      (typeof obj.link.id === 'string' && validIds.has(obj.link.id));

    if (!linkValid) return null;
    if (filteredItems.length === 0 && (!obj.link || obj.link.type !== 'doc')) {
      return null;
    }
    return {...obj, items: filteredItems};
  }

  // type === 'link' (external), 'ref', 'html', 'autogenerated' — pass through unchanged
  return obj;
}

/**
 * Filter the whole sidebars config (object whose values are sidebar arrays).
 */
function filterSidebar(sidebars: unknown, validIds: Set<string>): unknown {
  if (sidebars === null || typeof sidebars !== 'object') return sidebars;
  if (Array.isArray(sidebars)) {
    return sidebars
      .map((item) => filterSidebarItem(item, validIds))
      .filter((item) => item !== null);
  }
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(sidebars)) {
    out[key] = filterSidebar(value, validIds);
  }
  return out;
}

/**
 * Synchronously bridge versions/ → spec_versioned_docs/.
 * Call this at the top of docusaurus.config.ts before the config object.
 */
export function bridgeSpecVersions(siteDir: string): void {
  const versionsDir = path.resolve(siteDir, '..', 'versions');
  const manifestPath = path.join(versionsDir, 'manifest.yaml');

  if (!fs.existsSync(manifestPath)) return;

  const manifest = parseManifest(manifestPath);
  const releasedVersions = manifest.versions.filter(
    (v) => v.status === 'released',
  );

  if (releasedVersions.length === 0) return;

  const versionedDocsDir = path.join(siteDir, 'spec_versioned_docs');
  const versionedSidebarsDir = path.join(siteDir, 'spec_versioned_sidebars');
  fs.mkdirSync(versionedDocsDir, {recursive: true});
  fs.mkdirSync(versionedSidebarsDir, {recursive: true});

  for (const ver of releasedVersions) {
    const src = path.join(versionsDir, ver.id);
    const dest = path.join(versionedDocsDir, `version-${ver.id}`);

    if (!fs.existsSync(src)) {
      console.warn(
        `[spec-version-bridge] versions/${ver.id}/ not found, skipping`,
      );
      continue;
    }

    // Always refresh to pick up any source changes
    if (fs.existsSync(dest)) {
      fs.rmSync(dest, {recursive: true, force: true});
    }
    copyDirSync(src, dest);

    // Generate versioned sidebar from the live sidebarsSpec.ts, filtered to
    // only reference docs that exist in this version. Releases that predate a
    // sidebar item (e.g. patterns for 0.2.0) get a sidebar that omits it.
    const validIds = listDocIds(dest);
    const filtered = filterSidebar(loadSidebar(siteDir), validIds);
    const sidebarPath = path.join(
      versionedSidebarsDir,
      `version-${ver.id}-sidebars.json`,
    );
    fs.writeFileSync(
      sidebarPath,
      JSON.stringify(filtered, null, 2) + '\n',
    );
  }

  // Generate spec_versions.json
  const versionsJson = releasedVersions.map((v) => v.id);
  fs.writeFileSync(
    path.join(siteDir, 'spec_versions.json'),
    JSON.stringify(versionsJson) + '\n',
  );
}
