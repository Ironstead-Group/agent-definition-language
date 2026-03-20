/**
 * Transform an ADLDocument into the generator's Intermediate Representation.
 */

import type { ADLDocument } from "@adl-spec/core";
import type {
  AgentIR,
  DataClassificationIR,
  LifecycleIR,
  PermissionsIR,
  ResourceIR,
  RuntimeIR,
  SecurityIR,
  ToolIR,
} from "./types.js";

/**
 * Convert a validated ADLDocument into an AgentIR suitable for code generation.
 */
export function transformToIR(doc: ADLDocument): AgentIR {
  return {
    identity: buildIdentity(doc),
    model: buildModel(doc),
    systemPrompt: buildSystemPrompt(doc),
    tools: buildTools(doc),
    resources: buildResources(doc),
    permissions: buildPermissions(doc),
    security: buildSecurity(doc),
    runtime: buildRuntime(doc),
    dataClassification: buildDataClassification(doc),
    lifecycle: buildLifecycle(doc),
  };
}

function buildIdentity(doc: ADLDocument): AgentIR["identity"] {
  return {
    name: doc.name,
    description: doc.description,
    version: doc.version,
    ...(doc.id ? { id: doc.id } : {}),
  };
}

function buildModel(doc: ADLDocument): AgentIR["model"] {
  if (!doc.model) return null;
  return {
    ...(doc.model.provider ? { provider: doc.model.provider } : {}),
    ...(doc.model.name ? { name: doc.model.name } : {}),
    ...(doc.model.temperature !== undefined
      ? { temperature: doc.model.temperature }
      : {}),
    ...(doc.model.context_window !== undefined
      ? { contextWindow: doc.model.context_window }
      : {}),
    ...(doc.model.max_tokens !== undefined
      ? { maxTokens: doc.model.max_tokens }
      : {}),
    capabilities: doc.model.capabilities ?? [],
  };
}

function buildSystemPrompt(doc: ADLDocument): string | null {
  if (!doc.system_prompt) return null;
  if (typeof doc.system_prompt === "string") return doc.system_prompt;
  return doc.system_prompt.template;
}

function buildTools(doc: ADLDocument): ToolIR[] {
  if (!doc.tools) return [];
  return doc.tools.map((t) => ({
    name: t.name,
    description: t.description,
    parameters: (t.parameters as Record<string, unknown>) ?? null,
    returns: (t.returns as Record<string, unknown>) ?? null,
    requiresConfirmation: t.requires_confirmation ?? false,
    idempotent: t.idempotent ?? false,
    readOnly: t.read_only ?? false,
  }));
}

function buildResources(doc: ADLDocument): ResourceIR[] {
  if (!doc.resources) return [];
  return doc.resources.map((r) => ({
    name: r.name,
    type: r.type,
    description: r.description ?? null,
    uri: r.uri ?? null,
    mimeTypes: r.mime_types ?? [],
  }));
}

function buildPermissions(doc: ADLDocument): PermissionsIR {
  const p = doc.permissions;
  return {
    network: {
      allowedHosts: p?.network?.allowed_hosts ?? [],
      allowedPorts: p?.network?.allowed_ports ?? [],
      allowedProtocols: p?.network?.allowed_protocols ?? [],
      denyPrivate: p?.network?.deny_private ?? false,
    },
    filesystem: {
      allowedPaths:
        p?.filesystem?.allowed_paths?.map((fp) => ({
          path: fp.path,
          access: fp.access,
        })) ?? [],
      deniedPaths: p?.filesystem?.denied_paths ?? [],
    },
    environment: {
      allowedVariables: p?.environment?.allowed_variables ?? [],
      deniedVariables: p?.environment?.denied_variables ?? [],
    },
    execution: {
      allowedCommands: p?.execution?.allowed_commands ?? [],
      deniedCommands: p?.execution?.denied_commands ?? [],
      allowShell: p?.execution?.allow_shell ?? false,
    },
    resourceLimits: {
      maxMemoryMb: p?.resource_limits?.max_memory_mb ?? null,
      maxCpuPercent: p?.resource_limits?.max_cpu_percent ?? null,
      maxDurationSec: p?.resource_limits?.max_duration_sec ?? null,
      maxConcurrent: p?.resource_limits?.max_concurrent ?? null,
    },
  };
}

function buildSecurity(doc: ADLDocument): SecurityIR {
  const s = doc.security;
  return {
    authentication: s?.authentication
      ? {
          type: s.authentication.type ?? "none",
          required: s.authentication.required ?? false,
          scopes: s.authentication.scopes ?? [],
        }
      : null,
    encryptionInTransit: s?.encryption?.in_transit?.required ?? false,
    encryptionAtRest: s?.encryption?.at_rest?.required ?? false,
  };
}

function buildRuntime(doc: ADLDocument): RuntimeIR {
  const r = doc.runtime;
  return {
    errorHandling: {
      onToolError: r?.error_handling?.on_tool_error ?? "abort",
      maxRetries: r?.error_handling?.max_retries ?? 0,
      fallbackAction:
        r?.error_handling?.fallback_behavior?.action ?? null,
    },
    toolInvocation: {
      parallel: r?.tool_invocation?.parallel ?? false,
      maxConcurrent: r?.tool_invocation?.max_concurrent ?? null,
      timeoutMs: r?.tool_invocation?.timeout_ms ?? null,
    },
  };
}

function buildDataClassification(doc: ADLDocument): DataClassificationIR {
  return {
    sensitivity: doc.data_classification.sensitivity,
    categories: doc.data_classification.categories ?? [],
  };
}

function buildLifecycle(doc: ADLDocument): LifecycleIR | null {
  if (!doc.lifecycle) return null;
  return {
    status: doc.lifecycle.status,
    effectiveDate: doc.lifecycle.effective_date ?? null,
    sunsetDate: doc.lifecycle.sunset_date ?? null,
  };
}
