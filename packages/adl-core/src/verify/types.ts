/**
 * Types for the passport verification procedure (§10.3).
 *
 * Framework-neutral. Adapters for OpenClaw plugins, A2A middleware,
 * Google ADK callbacks, MCP server hooks, LangGraph nodes, and any
 * other agent runtime consume these types unchanged.
 */

import type { ADLDocument } from "../types/document.js";

export type EnforcementMode = "enforce" | "audit" | "permissive";

export interface VerificationStepResult {
  /** Spec section this step enforces (e.g. "1.1.1") */
  section: string;
  name: string;
  passed: boolean;
  detail: string;
  /** Severity if failed: "block" rejects in enforce mode; "warn" is informational */
  severity: "block" | "warn";
}

export interface VerificationOutcome {
  verified: boolean;
  steps: VerificationStepResult[];
  trustAnchor: {
    /** "discovery" | "direct_url" | "header" | "local_file" */
    retrievalChannel: string;
    discoveryAuthority?: string;
    didDocumentAuthority?: string;
  };
  publicKeySource: "inline_only" | "did_resolved" | "cross_checked" | "none";
  summary: string;
}

export interface VerifyConfig {
  /** Demanded enforcement mode for adapters to implement */
  mode: EnforcementMode;
  /** When true, fail verification if no signature is present */
  requireSignature: boolean;
  /** When true, fail verification if did:web cannot be resolved */
  requireDidResolution: boolean;
  /** When true, require provider authority to match TLS authority */
  requireProviderCoherence: boolean;
  /** Trust-on-First-Use: accept inline keys without DID resolution */
  trustOnFirstUse: boolean;
  /**
   * Localhost overrides for did:web resolution. Maps domain → base URL so
   * synthetic identifiers resolve in test/local environments.
   */
  didLocalOverrides: Record<string, string>;
  /**
   * Provider domain allowlist. When non-empty, the provider URL authority
   * must match one of these entries (§1.1.8).
   */
  providerAllowlist: string[];
}

/**
 * A reasonable default for `VerifyConfig`. Production deployments should
 * override `requireDidResolution` and `requireProviderCoherence` to true
 * and supply a `providerAllowlist`.
 */
export const DEFAULT_VERIFY_CONFIG: VerifyConfig = {
  mode: "enforce",
  requireSignature: true,
  requireDidResolution: false,
  requireProviderCoherence: false,
  trustOnFirstUse: true,
  didLocalOverrides: {},
  providerAllowlist: [],
};

export interface VerifyInput {
  /** Raw passport bytes as received (YAML or JSON) */
  passportBytes: Uint8Array;
  /** How the passport was retrieved */
  retrievalChannel: "discovery" | "direct_url" | "header" | "local_file";
  /** TLS authority used for retrieval (host:port) */
  retrievalAuthority?: string;
  /** Discovery domain authority if retrieved via discovery (§1.1.1) */
  discoveryAuthority?: string;
  /** When invoking the agent, the requesting agent's own passport (for §1.1.9) */
  requestingAgent?: ADLDocument;
}
