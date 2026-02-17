/**
 * ADL → MCP Server Configuration converter (spec §15.2)
 *
 * Maps: name, description, version, tools, resources, prompts
 */

interface ADLTool {
  name: string;
  description: string;
  parameters?: Record<string, unknown>;
  returns?: Record<string, unknown>;
  [key: string]: unknown;
}

interface ADLResource {
  name: string;
  type: string;
  description?: string;
  uri?: string;
  mime_types?: string[];
  [key: string]: unknown;
}

interface ADLPrompt {
  name: string;
  template: string;
  description?: string;
  arguments?: Record<string, unknown>;
  [key: string]: unknown;
}

export function convertToMCP(
  doc: Record<string, unknown>,
): Record<string, unknown> {
  const config: Record<string, unknown> = {};

  // Server info
  config.name = doc.name;
  config.description = doc.description;
  config.version = doc.version;

  // Tools
  const tools = doc.tools as ADLTool[] | undefined;
  if (tools && tools.length > 0) {
    config.tools = tools.map((tool) => {
      const mcpTool: Record<string, unknown> = {
        name: tool.name,
        description: tool.description,
      };
      if (tool.parameters) {
        mcpTool.inputSchema = tool.parameters;
      }
      return mcpTool;
    });
  }

  // Resources
  const resources = doc.resources as ADLResource[] | undefined;
  if (resources && resources.length > 0) {
    config.resources = resources.map((resource) => {
      const mcpResource: Record<string, unknown> = {
        name: resource.name,
        uri: resource.uri ?? `adl://resource/${resource.name}`,
      };
      if (resource.description) {
        mcpResource.description = resource.description;
      }
      if (resource.mime_types && resource.mime_types.length > 0) {
        mcpResource.mimeType = resource.mime_types[0];
      }
      return mcpResource;
    });
  }

  // Prompts
  const prompts = doc.prompts as ADLPrompt[] | undefined;
  if (prompts && prompts.length > 0) {
    config.prompts = prompts.map((prompt) => {
      const mcpPrompt: Record<string, unknown> = {
        name: prompt.name,
      };
      if (prompt.description) {
        mcpPrompt.description = prompt.description;
      }
      if (prompt.arguments) {
        mcpPrompt.arguments = Object.entries(
          prompt.arguments.properties as Record<string, unknown> ?? {},
        ).map(([name, schema]) => ({
          name,
          description:
            (schema as Record<string, unknown>)?.description ?? "",
          required: (
            (prompt.arguments?.required as string[]) ?? []
          ).includes(name),
        }));
      }
      return mcpPrompt;
    });
  }

  return config;
}
