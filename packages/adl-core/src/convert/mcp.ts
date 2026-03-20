/**
 * ADL -> MCP Server Configuration converter (spec Section 15.2)
 */

import type { ADLDocument } from "../types/document.js";
import type {
  MCPServerConfig,
  MCPTool,
  MCPResource,
  MCPPrompt,
} from "../types/converters.js";

export function convertToMCP(doc: ADLDocument): MCPServerConfig {
  const config: MCPServerConfig = {
    name: doc.name,
    description: doc.description,
    version: doc.version,
  };

  // Tools
  if (doc.tools && doc.tools.length > 0) {
    config.tools = doc.tools.map((tool): MCPTool => {
      const mcpTool: MCPTool = {
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
  if (doc.resources && doc.resources.length > 0) {
    config.resources = doc.resources.map((resource): MCPResource => {
      const mcpResource: MCPResource = {
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
  if (doc.prompts && doc.prompts.length > 0) {
    config.prompts = doc.prompts.map((prompt): MCPPrompt => {
      const mcpPrompt: MCPPrompt = {
        name: prompt.name,
      };
      if (prompt.description) {
        mcpPrompt.description = prompt.description;
      }
      if (prompt.arguments) {
        const properties =
          (prompt.arguments.properties as Record<string, unknown>) ?? {};
        const required = (prompt.arguments.required as string[]) ?? [];
        mcpPrompt.arguments = Object.entries(properties).map(
          ([name, schema]) => ({
            name,
            description:
              (schema as Record<string, unknown>)?.description?.toString() ??
              "",
            required: required.includes(name),
          }),
        );
      }
      return mcpPrompt;
    });
  }

  return config;
}
