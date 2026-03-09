/**
 * Remark plugin: Strip the first H1 heading from documents.
 *
 * Source Markdown files include an H1 for standalone reading, but on the
 * documentation site the frontmatter `title` is used instead. Removing the
 * H1 prevents Docusaurus from overriding the frontmatter title with the
 * H1 content.
 *
 * Must be registered in beforeDefaultRemarkPlugins so it runs before
 * Docusaurus's content title extraction.
 */

import type { Root, Heading } from 'mdast';

export default function remarkStripTitle() {
  return (tree: Root) => {
    for (let i = 0; i < tree.children.length; i++) {
      const node = tree.children[i];
      // Skip frontmatter yaml node
      if (node.type === 'yaml' || node.type === 'toml') continue;
      if (node.type === 'heading' && (node as Heading).depth === 1) {
        tree.children.splice(i, 1);
      }
      return;
    }
  };
}
