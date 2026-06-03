/**
 * Protocol version bridge: populate Docusaurus versioned docs from protocol/.
 *
 * The protocol layer is cut on the same cadence as the spec and frozen into
 * protocol/<version>/ (see scripts/cut_release.py). This bridge discovers those
 * frozen version directories on disk — any `protocol/<MAJOR.MINOR.PATCH>/` dir —
 * and copies them into protocol_versioned_docs/ so the docs plugin serves them.
 * No manifest and no hardcoded version list: new releases are picked up by their
 * directory name alone.
 *
 * Returns the released version ids (newest first) so docusaurus.config.ts can
 * build the plugin's `versions` map and `lastVersion` dynamically.
 *
 * Must be called synchronously at config evaluation time (before plugins init).
 */

import * as fs from 'fs';
import * as path from 'path';
import {bridgeVersions} from './version-bridge-core';

const SEMVER_DIR = /^\d+\.\d+\.\d+$/;

function compareSemverDesc(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if (pa[i] !== pb[i]) return pb[i] - pa[i];
  }
  return 0;
}

/**
 * Bridge protocol/<version>/ → protocol_versioned_docs/ and return the bridged
 * version ids, newest first.
 */
export function bridgeProtocolVersions(siteDir: string): string[] {
  const protocolDir = path.resolve(siteDir, '..', 'protocol');
  if (!fs.existsSync(protocolDir)) return [];

  const versionIds = fs
    .readdirSync(protocolDir, {withFileTypes: true})
    .filter((e) => e.isDirectory() && SEMVER_DIR.test(e.name))
    .map((e) => e.name)
    .sort(compareSemverDesc);

  return bridgeVersions({
    siteDir,
    sourceDir: protocolDir,
    pluginId: 'protocol',
    sidebarModule: path.join(siteDir, 'sidebarsProtocol.ts'),
    versionIds,
  });
}
