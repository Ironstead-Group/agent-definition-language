/**
 * Remark plugin: Convert spec version badge lines into a styled table.
 *
 * Converts a single paragraph containing:
 *   **Version:** 0.1.0-draft
 *   **Status:** Draft
 *   **Patent Status:** Patent Pending (...)
 *
 * Into a proper mdast table wrapped in a div for styling.
 */

import { visit } from 'unist-util-visit';
import type { Root, Paragraph, Table, TableRow, TableCell, PhrasingContent } from 'mdast';

interface BadgeField {
  label: string;
  value: PhrasingContent[];
}

function extractFields(node: Paragraph): BadgeField[] {
  const fields: BadgeField[] = [];
  let currentLabel: string | null = null;
  let currentValue: PhrasingContent[] = [];

  for (const child of node.children) {
    if (child.type === 'strong' && child.children?.[0]?.type === 'text') {
      if (currentLabel) {
        fields.push({ label: currentLabel, value: currentValue });
      }
      currentLabel = child.children[0].value;
      currentValue = [];
    } else if (currentLabel) {
      if (child.type === 'inlineCode') {
        currentValue.push(child);
      } else if (child.type === 'text') {
        const cleaned = child.value.replace(/^\s+/, '').replace(/\n$/, '').trim();
        if (cleaned) {
          currentValue.push({ type: 'text', value: cleaned });
        }
      } else if (child.type === 'link') {
        currentValue.push(child);
      }
    }
  }

  if (currentLabel) {
    fields.push({ label: currentLabel, value: currentValue });
  }

  return fields;
}

function makeRow(label: string, valueNodes: PhrasingContent[]): TableRow {
  const labelCell: TableCell = {
    type: 'tableCell',
    children: [
      { type: 'strong', children: [{ type: 'text', value: label }] },
    ],
  };
  const valueCell: TableCell = {
    type: 'tableCell',
    children: valueNodes.length > 0 ? valueNodes : [{ type: 'text', value: '' }],
  };
  return { type: 'tableRow', children: [labelCell, valueCell] };
}

export default function remarkVersionBadge() {
  return (tree: Root) => {
    const replacements: Map<number, any[]> = new Map();

    visit(tree, 'paragraph', (node: Paragraph, index: number | undefined, parent) => {
      if (index === undefined || !parent || parent !== tree) return;

      const firstChild = node.children[0];
      if (firstChild?.type !== 'strong') return;
      const strongText = firstChild.children?.[0];
      if (strongText?.type !== 'text' || strongText.value !== 'Version:') return;

      const fields = extractFields(node);
      const labelMap = new Map(fields.map(f => [f.label, f.value]));

      const version = labelMap.get('Version:');
      const status = labelMap.get('Status:');
      if (!version || !status) return;

      const rows: TableRow[] = [
        {
          type: 'tableRow',
          children: [
            { type: 'tableCell', children: [{ type: 'text', value: '' }] },
            { type: 'tableCell', children: [{ type: 'text', value: '' }] },
          ],
        },
        makeRow('Version', version),
        makeRow('Status', status),
      ];

      const patent = labelMap.get('Patent Status:');
      if (patent) {
        rows.push(makeRow('Patent Status', patent));
      }

      const table: Table = {
        type: 'table',
        align: [null, null],
        children: rows,
      };

      const openDiv = { type: 'html', value: '<div class="version-badge">' };
      const closeDiv = { type: 'html', value: '</div>' };

      replacements.set(index, [openDiv, table, closeDiv]);
    });

    for (const [idx, nodes] of [...replacements.entries()].sort((a, b) => b[0] - a[0])) {
      tree.children.splice(idx, 1, ...nodes);
    }
  };
}
