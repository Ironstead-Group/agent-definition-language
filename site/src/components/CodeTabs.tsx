import React from "react";
import Tabs from "@theme/Tabs";
import TabItem from "@theme/TabItem";
import CodeBlock from "@theme/CodeBlock";

interface CodeTabsProps {
  /** YAML source code to display */
  yaml: string;
  /** Prebuilt JSON (string or parsed object from import) */
  json: string | object;
  /** Optional title for the code block */
  title?: string;
  /** Whether to show line numbers */
  showLineNumbers?: boolean;
}

/**
 * CodeTabs component displays YAML with prebuilt JSON in tabs.
 *
 * Usage in MDX:
 * ```mdx
 * import CodeTabs from '@site/src/components/CodeTabs';
 * import yamlContent from '@site/_yaml-sources/examples/production.yaml';
 * import jsonContent from '@site/_yaml-sources/examples/production.json';
 *
 * <CodeTabs yaml={yamlContent} json={jsonContent} title="production.adl" />
 * ```
 */
export default function CodeTabs({
  yaml: yamlSource,
  json: jsonSource,
  title,
  showLineNumbers = false,
}: CodeTabsProps): React.ReactElement {
  const trimmedYaml = yamlSource.trim();
  // Handle both string and parsed object (JSON imports are auto-parsed)
  const trimmedJson = typeof jsonSource === 'string'
    ? jsonSource.trim()
    : JSON.stringify(jsonSource, null, 2);

  const yamlTitle = title ? `${title}.yaml` : undefined;
  const jsonTitle = title ? `${title}.json` : undefined;

  return (
    <Tabs groupId="code-format" defaultValue="yaml">
      <TabItem value="yaml" label="YAML">
        <CodeBlock
          language="yaml"
          title={yamlTitle}
          showLineNumbers={showLineNumbers}
        >
          {trimmedYaml}
        </CodeBlock>
      </TabItem>
      <TabItem value="json" label="JSON">
        <CodeBlock
          language="json"
          title={jsonTitle}
          showLineNumbers={showLineNumbers}
        >
          {trimmedJson}
        </CodeBlock>
      </TabItem>
    </Tabs>
  );
}
