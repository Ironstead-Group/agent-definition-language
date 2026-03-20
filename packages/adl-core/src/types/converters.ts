/**
 * Output types for ADL converters.
 */

export interface A2ASkill {
  id: string;
  name: string;
  description: string;
  inputSchema?: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
  tags?: string[];
}

export interface A2AProvider {
  organization: string;
  url?: string;
}

export interface A2AAuthentication {
  schemes?: string[];
  scopes?: string[];
}

export interface A2AAgentCard {
  name: string;
  description: string;
  version: string;
  id?: string;
  provider?: A2AProvider;
  skills?: A2ASkill[];
  authentication?: A2AAuthentication;
  documentationUrl?: string;
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema?: Record<string, unknown>;
}

export interface MCPResource {
  name: string;
  uri: string;
  description?: string;
  mimeType?: string;
}

export interface MCPPromptArgument {
  name: string;
  description: string;
  required: boolean;
}

export interface MCPPrompt {
  name: string;
  description?: string;
  arguments?: MCPPromptArgument[];
}

export interface MCPServerConfig {
  name: string;
  description: string;
  version: string;
  tools?: MCPTool[];
  resources?: MCPResource[];
  prompts?: MCPPrompt[];
}
