/**
 * Remark plugin: Convert blockquote admonitions to Docusaurus container directives.
 *
 * Converts:
 *   > **Note:** text        → containerDirective(note) with text content
 *   > **Regulatory Disclaimer:** text → containerDirective(warning) with title + text
 *   > **Tip:** text          → containerDirective(tip) with text content
 *
 * Must be registered in beforeDefaultRemarkPlugins so it runs before
 * Docusaurus's built-in admonition processing.
 */

import { visit } from 'unist-util-visit';
import type { Root, Blockquote, Paragraph } from 'mdast';

interface AdmonitionMapping {
  label: string;
  type: string;
  title: string;
}

const MAPPINGS: AdmonitionMapping[] = [
  { label: 'Regulatory Disclaimer:', type: 'warning', title: 'Regulatory Disclaimer' },
  { label: 'Note:', type: 'note', title: '' },
  { label: 'Tip:', type: 'tip', title: '' },
];

function getTextContent(node: any): string {
  if (node.type === 'text') return node.value;
  if (node.children) return node.children.map(getTextContent).join('');
  return '';
}

export default function remarkBlockquoteAdmonitions() {
  return (tree: Root) => {
    visit(tree, 'blockquote', (node: Blockquote, index: number | undefined, parent) => {
      if (index === undefined || !parent) return;
      if (!node.children || node.children.length === 0) return;

      const firstChild = node.children[0];
      if (firstChild.type !== 'paragraph') return;
      if (!firstChild.children || firstChild.children.length === 0) return;

      const firstInline = firstChild.children[0];
      if (firstInline.type !== 'strong') return;

      const strongText = getTextContent(firstInline);

      for (const mapping of MAPPINGS) {
        if (strongText !== mapping.label) continue;

        // Build content paragraph from remaining inline content
        const contentParts = firstChild.children.slice(1);
        const contentText = contentParts.map(getTextContent).join('').trim();

        const children: any[] = [];

        // Add directive label (title) if present
        if (mapping.title) {
          children.push({
            type: 'paragraph',
            data: { directiveLabel: true },
            children: [{ type: 'text', value: mapping.title }],
          });
        }

        // Add the main content paragraph
        if (contentText) {
          children.push({
            type: 'paragraph',
            children: [{ type: 'text', value: contentText }],
          });
        }

        // Add any additional blockquote paragraphs
        for (let i = 1; i < node.children.length; i++) {
          const text = getTextContent(node.children[i]);
          if (text.trim()) {
            children.push({
              type: 'paragraph',
              children: [{ type: 'text', value: text.trim() }],
            });
          }
        }

        // Create containerDirective node (processed by remark-directive / Docusaurus admonitions)
        const directive = {
          type: 'containerDirective',
          name: mapping.type,
          attributes: {},
          children,
        };

        parent.children[index] = directive as any;
        return;
      }
    });
  };
}
