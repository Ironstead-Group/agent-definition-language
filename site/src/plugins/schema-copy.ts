/**
 * Docusaurus lifecycle plugin: Copy schema files to static/.
 *
 * Copies versions/{id}/schema.json → static/{shortVersion}/schema.json
 * and generates a draft-07 variant for IDE IntelliSense.
 */

import * as fs from 'fs';
import * as path from 'path';
import type { LoadContext, Plugin } from '@docusaurus/types';

export default function schemaCopyPlugin(context: LoadContext): Plugin {
  return {
    name: 'schema-copy',

    async loadContent() {
      const versionsDir = path.resolve(context.siteDir, '..', 'versions');
      const manifestPath = path.join(versionsDir, 'manifest.yaml');

      if (!fs.existsSync(manifestPath)) return;

      // Find version directories
      const entries = fs.readdirSync(versionsDir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory() || entry.name === 'node_modules') continue;

        const versionId = entry.name;
        const schemaPath = path.join(versionsDir, versionId, 'schema.json');
        if (!fs.existsSync(schemaPath)) continue;

        // Derive short version (e.g., "0.1.0" → "0.1")
        const parts = versionId.split('.');
        const shortVersion = `${parts[0]}.${parts[1]}`;
        const staticDir = path.join(context.siteDir, 'static', shortVersion);

        if (!fs.existsSync(staticDir)) {
          fs.mkdirSync(staticDir, { recursive: true });
        }

        // Copy canonical schema (2020-12)
        fs.copyFileSync(schemaPath, path.join(staticDir, 'schema.json'));

        // Generate draft-07 variant for IDE IntelliSense
        const schemaContent = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));
        schemaContent['$schema'] = 'http://json-schema.org/draft-07/schema#';
        fs.writeFileSync(
          path.join(staticDir, 'schema-draft07.json'),
          JSON.stringify(schemaContent, null, 2) + '\n'
        );
      }
    },
  };
}
