/**
 * Remark plugin: Convert profile badge lines into a styled table.
 *
 * Converts a single paragraph containing:
 *   **Identifier:** `urn:adl:profile:governance:1.0`
 *   **Status:** Draft
 *   **ADL Compatibility:** 0.1.x
 *
 * Into a proper mdast table wrapped in an HTML div for styling.
 *
 * The three lines are parsed as a single paragraph because there are
 * no blank lines between them. The paragraph children contain:
 *   strong("Identifier:"), text(" "), inlineCode("urn:..."), text("\n"),
 *   strong("Status:"), text(" Draft\n"),
 *   strong("ADL Compatibility:"), text(" 0.1.x")
 */

import { visit } from 'unist-util-visit';
import type { Root, Paragraph, Table, TableRow, TableCell, PhrasingContent } from 'mdast';

interface BadgeField {
  label: string;
  value: PhrasingContent[];
}

function extractBadgeFields(node: Paragraph): BadgeField[] | null {
  const fields: BadgeField[] = [];
  let currentLabel: string | null = null;
  let currentValue: PhrasingContent[] = [];

  for (const child of node.children) {
    if (child.type === 'strong' && child.children?.[0]?.type === 'text') {
      // Start a new field — save the previous one
      if (currentLabel) {
        fields.push({ label: currentLabel, value: currentValue });
      }
      currentLabel = child.children[0].value;
      currentValue = [];
    } else if (currentLabel) {
      if (child.type === 'text') {
        // Remove leading space and trailing newline
        const cleaned = child.value.replace(/^\s+/, '').replace(/\n$/, '').trim();
        if (cleaned) {
          currentValue.push({ type: 'text', value: cleaned });
        }
      } else {
        // Preserve inlineCode, link, and any other phrasing content as-is
        currentValue.push(child);
      }
    }
  }

  // Save the last field
  if (currentLabel) {
    fields.push({ label: currentLabel, value: currentValue });
  }

  return fields.length >= 3 ? fields : null;
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

export default function remarkProfileBadge() {
  return (tree: Root) => {
    const replacements: Map<number, any[]> = new Map();

    visit(tree, 'paragraph', (node: Paragraph, index: number | undefined, parent) => {
      if (index === undefined || !parent) return;

      // Check if the first child is a strong with a recognized badge label
      const firstChild = node.children[0];
      if (firstChild?.type !== 'strong') return;
      const strongText = firstChild.children?.[0];
      if (strongText?.type !== 'text') return;

      const BADGE_STARTS = ['Identifier:', 'Companion to:'];
      if (!BADGE_STARTS.includes(strongText.value)) return;

      const fields = extractBadgeFields(node);
      if (!fields) return;

      // Verify we have the expected labels
      const labelMap = new Map(fields.map(f => [f.label, f.value]));
      const status = labelMap.get('Status:');
      const compat = labelMap.get('ADL Compatibility:');

      if (!status || !compat) return;

      const rows: TableRow[] = [
        // Header row (empty — used for alignment only)
        {
          type: 'tableRow',
          children: [
            { type: 'tableCell', children: [{ type: 'text', value: '' }] },
            { type: 'tableCell', children: [{ type: 'text', value: '' }] },
          ],
        },
      ];

      // Add all fields in order
      for (const field of fields) {
        const label = field.label.replace(/:$/, '');
        rows.push(makeRow(label, field.value));
      }

      const table: Table = {
        type: 'table',
        align: [null, null],
        children: rows,
      };

      const openDiv = { type: 'html', value: '<div class="profile-badge">' };
      const closeDiv = { type: 'html', value: '</div>' };

      replacements.set(index, [openDiv, table, closeDiv]);
    });

    // Apply in reverse order
    for (const [idx, nodes] of [...replacements.entries()].sort((a, b) => b[0] - a[0])) {
      tree.children.splice(idx, 1, ...nodes);
    }
  };
}
