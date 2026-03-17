/**
 * Remark plugin: Wrap the Example section with a Docusaurus info admonition.
 *
 * Finds "## N. Example" heading, inserts :::info before the code block,
 * and adds title="filename" to the ```json fence.
 *
 * Reads example_filename from frontmatter: adl_profile_meta.example_filename
 */

import type { Root, Heading, Code } from 'mdast';
import type { VFile } from 'vfile';

function getHeadingText(node: Heading): string {
  return node.children
    .map((child: any) => (child.type === 'text' ? child.value : ''))
    .join('');
}

export default function remarkWrapExample() {
  return (tree: Root, file: VFile) => {
    const frontMatter = (file.data as any)?.frontMatter;
    const exampleFilename = frontMatter?.adl_profile_meta?.example_filename;
    if (!exampleFilename) return;

    let exampleHeadingIndex: number | null = null;

    for (let i = 0; i < tree.children.length; i++) {
      const node = tree.children[i];
      if (node.type !== 'heading' || node.depth !== 2) continue;
      const text = getHeadingText(node);
      if (/^\d+\.\s+Example$/.test(text)) {
        exampleHeadingIndex = i;
        break;
      }
    }

    if (exampleHeadingIndex === null) return;

    for (let i = exampleHeadingIndex + 1; i < tree.children.length; i++) {
      const node = tree.children[i];
      if (node.type === 'heading') break;

      if (node.type === 'code' && (node as Code).lang === 'json') {
        (node as Code).meta = `title="${exampleFilename}"`;

        const admonition = {
          type: 'containerDirective',
          name: 'info',
          attributes: {},
          data: { hName: 'div' },
          children: [
            {
              type: 'paragraph',
              data: { directiveLabel: true },
              children: [{ type: 'text', value: 'Complete Example' }],
            },
            {
              type: 'paragraph',
              children: [{ type: 'text', value: 'This example demonstrates a complete agent definition using this profile.' }],
            },
          ],
        };

        tree.children.splice(i, 0, admonition as any);
        break;
      }
    }
  };
}
