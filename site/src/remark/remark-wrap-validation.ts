/**
 * Remark plugin: Wrap the Validation Rules section with a warning admonition.
 *
 * Finds "## N. Validation Rules" heading and replaces the introductory
 * paragraph with a containerDirective warning admonition.
 */

import type { Root, Heading } from 'mdast';

function getHeadingText(node: Heading): string {
  return node.children
    .map((child: any) => (child.type === 'text' ? child.value : ''))
    .join('');
}

export default function remarkWrapValidation() {
  return (tree: Root) => {
    let validationHeadingIndex: number | null = null;

    for (let i = 0; i < tree.children.length; i++) {
      const node = tree.children[i];
      if (node.type !== 'heading' || node.depth !== 2) continue;
      const text = getHeadingText(node);
      if (/^\d+\.\s+Validation Rules$/.test(text)) {
        validationHeadingIndex = i;
        break;
      }
    }

    if (validationHeadingIndex === null) return;

    const nextIndex = validationHeadingIndex + 1;
    if (nextIndex >= tree.children.length) return;

    const nextNode = tree.children[nextIndex];
    if (nextNode.type !== 'paragraph') return;

    const warning = {
      type: 'containerDirective',
      name: 'warning',
      attributes: {},
      children: [
        {
          type: 'paragraph',
          data: { directiveLabel: true },
          children: [{ type: 'text', value: 'Validation Required' }],
        },
        {
          type: 'paragraph',
          children: [
            { type: 'text', value: 'Implementations validating against this profile ' },
            { type: 'strong', children: [{ type: 'text', value: 'MUST' }] },
            { type: 'text', value: ' enforce the following rules. Non-conforming documents should be rejected.' },
          ],
        },
      ],
    };

    tree.children[nextIndex] = warning as any;
  };
}
