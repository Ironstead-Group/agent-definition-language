/**
 * Remark plugin: Rewrite repo-relative links for the documentation site.
 *
 * For profile READMEs:
 *   ./1.0/profile.md        → ./specification
 *   ../registry/             → /profiles/registry/overview
 *   ../../versions/.../spec.md → /spec
 *   ../README.md             → /profiles
 *
 * For profile specs (profile.md):
 *   schema.json, *.md, *.yaml → GitHub URLs
 *   ../registry/1.0/profile.md → GitHub URL
 *
 * For spec (spec.md):
 *   ./examples/name.yaml → examples/name (relative, version-aware)
 *   ../../profiles/...   → /profiles/...
 *   ./schema.json → GitHub URL
 */

import { visit } from 'unist-util-visit';
import type { Root, Link, Parent } from 'mdast';
import type { VFile } from 'vfile';

const GITHUB_BASE =
  'https://github.com/Ironstead-Group/agent-definition-language/blob/main';

export default function remarkRewriteLinks() {
  return (tree: Root, file: VFile) => {
    const filePath = file.path || file.history?.[0] || '';
    const isReadme = filePath.endsWith('README.md');
    const isProfileSpec = /profiles\/[^/]+\/[\d.]+\/profile\.md$/.test(filePath);
    const isSpec = /versions\/[^/]+\/spec\.md$/.test(filePath) || /spec_versioned_docs\/[^/]+\/spec\.md$/.test(filePath);
    const isExamplesReadme = /examples\/README\.md$/.test(filePath);

    visit(tree, 'link', (node: Link, index, parent) => {
      const url = node.url;

      // Skip external, absolute, anchor, and mailto links
      if (/^(https?:|\/|#|mailto:)/.test(url)) return;

      if (isReadme) {
        rewriteReadmeLink(node, filePath);
      } else if (isProfileSpec) {
        rewriteProfileSpecLink(node, filePath);
      } else if (isSpec) {
        rewriteSpecLink(node);
      } else if (isExamplesReadme) {
        rewriteExamplesReadmeLink(node);
      }

      // Replace link with its children (unwrap) if marked for removal
      if ((node as any).__remove && parent && index !== undefined) {
        (parent as Parent).children.splice(index, 1, ...node.children);
      }
    });
  };
}

function rewriteReadmeLink(node: Link, filePath: string) {
  const url = node.url;

  // ./1.0/profile.md → ./specification (profile READMEs)
  if (/^\.\/[\d.]+\/profile\.md$/.test(url)) {
    node.url = './specification';
    return;
  }

  // ./profileId/ → ./profileId/overview (profiles index README)
  const localProfileMatch = url.match(/^\.\/([a-z-]+)\/$/);
  if (localProfileMatch) {
    node.url = `./${localProfileMatch[1]}/overview`;
    return;
  }

  // ../profileId/ → /profiles/profileId/overview (profile READMEs)
  const siblingProfileMatch = url.match(/^\.\.\/([a-z-]+)\/$/);
  if (siblingProfileMatch) {
    node.url = `/profiles/${siblingProfileMatch[1]}/overview`;
    return;
  }

  // ../../versions/.../spec.md#fragment → /spec#fragment (profile READMEs)
  const specMatch2 = url.match(/^\.\.\/\.\.\/versions\/[^)]*spec\.md(?:#(.*))?$/);
  if (specMatch2) {
    node.url = specMatch2[1] ? `/spec#${specMatch2[1]}` : '/spec';
    return;
  }

  // ../versions/.../spec.md#fragment → /spec#fragment (profiles index README)
  const specMatch1 = url.match(/^\.\.\/versions\/[^)]*spec\.md(?:#(.*))?$/);
  if (specMatch1) {
    node.url = specMatch1[1] ? `/spec#${specMatch1[1]}` : '/spec';
    return;
  }

  // ../README.md → /profiles
  if (url === '../README.md') {
    node.url = '/profiles';
    return;
  }

  // CONTRIBUTING.md → /contributing
  if (/CONTRIBUTING\.md$/.test(url)) {
    node.url = '/contributing';
    return;
  }

  // .github/ paths → GitHub URLs
  if (/\.github\//.test(url)) {
    node.url = `${GITHUB_BASE}/${url.replace(/^(\.\.\/)+/, '')}`;
    return;
  }

  // ./COMPATIBILITY.md → GitHub URL (from profile READMEs)
  if (url === './COMPATIBILITY.md') {
    const profileDirMatch = filePath.match(/profiles\/([^/]+)\/README\.md$/);
    if (profileDirMatch) {
      node.url = `${GITHUB_BASE}/profiles/${profileDirMatch[1]}/COMPATIBILITY.md`;
    }
    return;
  }
}

function rewriteProfileSpecLink(node: Link, filePath: string) {
  const url = node.url;

  // Extract the profile base path from the file path
  const profileMatch = filePath.match(/profiles\/([^/]+)\/([\d.]+)\//);
  if (!profileMatch) return;

  const profileId = profileMatch[1];
  const profileVersion = profileMatch[2];
  const profileBase = `profiles/${profileId}/${profileVersion}`;

  // governance-record.md → on-site page (it's included in the docs plugin)
  if (url === 'governance-record.md') {
    node.url = `/profiles/${profileId}/${profileVersion}/governance-record`;
    return;
  }

  // schema.json → strip link (private repo, not accessible to public visitors)
  if (url === 'schema.json') {
    (node as any).__remove = true;
    return;
  }

  // Relative files (*.md, *.yaml, etc.) → GitHub URLs
  if (/\.(?:json|md|yaml)$/.test(url)) {
    if (url.startsWith('../')) {
      node.url = `${GITHUB_BASE}/profiles/${url.replace(/^\.\.\//, '')}`;
    } else {
      node.url = `${GITHUB_BASE}/${profileBase}/${url}`;
    }
  }
}

function rewriteSpecLink(node: Link) {
  const url = node.url;

  // ./examples/name.yaml → examples/name (relative for version-aware routing)
  const exampleMatch = url.match(/^\.\/examples\/([^)]+)\.yaml$/);
  if (exampleMatch) {
    node.url = `examples/${exampleMatch[1]}`;
    return;
  }

  // ../../profiles/... → /profiles/...
  const profileMatch = url.match(/^\.\.\/\.\.\/profiles\/(.*)$/);
  if (profileMatch) {
    node.url = `/profiles/${profileMatch[1] || ''}`;
    return;
  }

  // ../profiles/... → /profiles/... (from spec_versioned_docs)
  const profileMatch2 = url.match(/^\.\.\/profiles\/(.*)$/);
  if (profileMatch2) {
    node.url = `/profiles/${profileMatch2[1] || ''}`;
    return;
  }

  // ./schema.json → GitHub URL
  if (url === './schema.json') {
    node.url = `${GITHUB_BASE}/versions/draft/schema.json`;
    return;
  }
}

function rewriteExamplesReadmeLink(node: Link) {
  const url = node.url;

  // ./name.yaml → /examples/name
  const exampleMatch = url.match(/^\.\/([^)]+)\.yaml$/);
  if (exampleMatch) {
    node.url = `/spec/examples/${exampleMatch[1]}`;
    return;
  }

  // ../../../CONTRIBUTING.md → /contributing
  if (/CONTRIBUTING\.md$/.test(url)) {
    node.url = '/contributing';
    return;
  }
}
