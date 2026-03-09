/**
 * Remark plugin: Strip repo-only sections from profile READMEs.
 *
 * Removes sections titled "Specification", "Maintainers", or "See Also"
 * and all content below them. Only applies to README.md files.
 */

import { visit } from 'unist-util-visit';
import type { Root, Heading } from 'mdast';
import type { VFile } from 'vfile';

const STRIP_SECTIONS = ['Specification', 'Maintainers', 'See Also'];

function getHeadingText(node: Heading): string {
  return node.children
    .map((child: any) => {
      if (child.type === 'text') return child.value;
      if (child.children) return child.children.map((c: any) => c.value || '').join('');
      return '';
    })
    .join('');
}

export default function remarkStripSections() {
  return (tree: Root, file: VFile) => {
    const filePath = file.path || file.history?.[0] || '';
    if (!filePath.endsWith('README.md')) return;

    // Only strip from profile READMEs (profiles/{id}/README.md), not profiles index
    if (!/profiles\/[a-z][^/]+\/README\.md$/.test(filePath)) return;

    let stripFromIndex: number | null = null;

    for (let i = 0; i < tree.children.length; i++) {
      const node = tree.children[i];
      if (node.type !== 'heading' || node.depth !== 2) continue;

      const text = getHeadingText(node);
      if (STRIP_SECTIONS.includes(text)) {
        stripFromIndex = i;
        break;
      }
    }

    if (stripFromIndex !== null) {
      tree.children.splice(stripFromIndex);
    }
  };
}
