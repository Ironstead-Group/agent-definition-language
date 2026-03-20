/**
 * Intermediate Representation (IR) types for the ADL code generator.
 *
 * The IR is a normalized, framework-agnostic representation of an ADL document
 * that target renderers consume to produce code output.
 */

export interface AgentIR {
  identity: {
    name: string;
    description: string;
    version: string;
    id?: string;
  };
  model: {
    provider?: string;
    name?: string;
    temperature?: number;
    contextWindow?: number;
    maxTokens?: number;
    capabilities: string[];
  } | null;
  systemPrompt: string | null;
  tools: ToolIR[];
  resources: ResourceIR[];
  permissions: PermissionsIR;
  security: SecurityIR;
  runtime: RuntimeIR;
  dataClassification: DataClassificationIR;
  lifecycle: LifecycleIR | null;
}

export interface ToolIR {
  name: string;
  description: string;
  parameters: Record<string, unknown> | null;
  returns: Record<string, unknown> | null;
  requiresConfirmation: boolean;
  idempotent: boolean;
  readOnly: boolean;
}

export interface ResourceIR {
  name: string;
  type: string;
  description: string | null;
  uri: string | null;
  mimeTypes: string[];
}

export interface PermissionsIR {
  network: {
    allowedHosts: string[];
    allowedPorts: number[];
    allowedProtocols: string[];
    denyPrivate: boolean;
  };
  filesystem: {
    allowedPaths: Array<{ path: string; access: string }>;
    deniedPaths: string[];
  };
  environment: {
    allowedVariables: string[];
    deniedVariables: string[];
  };
  execution: {
    allowedCommands: string[];
    deniedCommands: string[];
    allowShell: boolean;
  };
  resourceLimits: {
    maxMemoryMb: number | null;
    maxCpuPercent: number | null;
    maxDurationSec: number | null;
    maxConcurrent: number | null;
  };
}

export interface SecurityIR {
  authentication: {
    type: string;
    required: boolean;
    scopes: string[];
  } | null;
  encryptionInTransit: boolean;
  encryptionAtRest: boolean;
}

export interface RuntimeIR {
  errorHandling: {
    onToolError: string;
    maxRetries: number;
    fallbackAction: string | null;
  };
  toolInvocation: {
    parallel: boolean;
    maxConcurrent: number | null;
    timeoutMs: number | null;
  };
}

export interface DataClassificationIR {
  sensitivity: string;
  categories: string[];
}

export interface LifecycleIR {
  status: string;
  effectiveDate: string | null;
  sunsetDate: string | null;
}
