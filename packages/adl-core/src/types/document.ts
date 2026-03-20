/**
 * ADL Document type definitions derived from the 0.2.0 JSON Schema.
 */

import type {
  AttestationType,
  AuthType,
  BackoffStrategy,
  DataCategory,
  FallbackAction,
  FileAccess,
  LifecycleStatus,
  ModelCapability,
  OutputFormat,
  ResourceType,
  Sensitivity,
  SignedContent,
  ToolErrorAction,
} from "./enums.js";

export type Extensions = Record<string, Record<string, unknown>>;

export interface DataClassification {
  sensitivity: Sensitivity;
  categories?: DataCategory[];
  retention?: {
    min_days?: number;
    max_days?: number;
    policy_uri?: string;
    extensions?: Extensions;
  };
  handling?: {
    encryption_required?: boolean;
    anonymization_required?: boolean;
    cross_border_restricted?: boolean;
    logging_required?: boolean;
    extensions?: Extensions;
  };
  extensions?: Extensions;
}

export interface Lifecycle {
  status: LifecycleStatus;
  effective_date?: string;
  sunset_date?: string;
  successor?: string;
  extensions?: Extensions;
}

export interface Provider {
  name: string;
  url?: string;
  contact?: string;
  extensions?: Extensions;
}

export interface PublicKey {
  algorithm: string;
  value: string;
  extensions?: Extensions;
}

export interface CryptographicIdentity {
  did?: string;
  public_key?: PublicKey;
  extensions?: Extensions;
}

export interface ModelConfig {
  provider?: string;
  name?: string;
  version?: string;
  context_window?: number;
  temperature?: number;
  max_tokens?: number;
  capabilities?: ModelCapability[];
  extensions?: Extensions;
}

export interface SystemPromptTemplate {
  template: string;
  variables?: Record<string, unknown>;
  extensions?: Extensions;
}

export type SystemPrompt = string | SystemPromptTemplate;

export interface ToolExample {
  name?: string;
  input?: Record<string, unknown>;
  output?: unknown;
  extensions?: Extensions;
}

export interface ToolAnnotations {
  openapi_ref?: string;
  operation_id?: string;
  [key: string]: unknown;
}

export interface Tool {
  name: string;
  description: string;
  parameters?: Record<string, unknown>;
  returns?: Record<string, unknown>;
  examples?: ToolExample[];
  requires_confirmation?: boolean;
  idempotent?: boolean;
  read_only?: boolean;
  annotations?: ToolAnnotations;
  data_classification?: DataClassification;
  extensions?: Extensions;
}

export interface Resource {
  name: string;
  type: ResourceType;
  description?: string;
  uri?: string;
  mime_types?: string[];
  schema?: Record<string, unknown>;
  annotations?: Record<string, unknown>;
  data_classification?: DataClassification;
  extensions?: Extensions;
}

export interface Prompt {
  name: string;
  template: string;
  description?: string;
  arguments?: Record<string, unknown>;
  extensions?: Extensions;
}

export interface NetworkPermissions {
  allowed_hosts?: string[];
  allowed_ports?: number[];
  allowed_protocols?: string[];
  deny_private?: boolean;
  extensions?: Extensions;
}

export interface FilesystemPath {
  path: string;
  access: FileAccess;
}

export interface FilesystemPermissions {
  allowed_paths?: FilesystemPath[];
  denied_paths?: string[];
  extensions?: Extensions;
}

export interface EnvironmentPermissions {
  allowed_variables?: string[];
  denied_variables?: string[];
  extensions?: Extensions;
}

export interface ExecutionPermissions {
  allowed_commands?: string[];
  denied_commands?: string[];
  allow_shell?: boolean;
  extensions?: Extensions;
}

export interface ResourceLimits {
  max_memory_mb?: number;
  max_cpu_percent?: number;
  max_duration_sec?: number;
  max_concurrent?: number;
  extensions?: Extensions;
}

export interface Permissions {
  network?: NetworkPermissions;
  filesystem?: FilesystemPermissions;
  environment?: EnvironmentPermissions;
  execution?: ExecutionPermissions;
  resource_limits?: ResourceLimits;
  extensions?: Extensions;
}

export interface Authentication {
  type?: AuthType;
  required?: boolean;
  scopes?: string[];
  token_endpoint?: string;
  issuer?: string;
  audience?: string;
  extensions?: Extensions;
}

export interface EncryptionConfig {
  required?: boolean;
  min_version?: string;
  extensions?: Extensions;
}

export interface EncryptionAtRest {
  required?: boolean;
  algorithm?: string;
  extensions?: Extensions;
}

export interface Encryption {
  in_transit?: EncryptionConfig;
  at_rest?: EncryptionAtRest;
  extensions?: Extensions;
}

export interface Signature {
  algorithm: string;
  value: string;
  signed_content: SignedContent;
  digest_algorithm?: string;
  digest_value?: string;
  extensions?: Extensions;
}

export interface Attestation {
  type?: AttestationType;
  issuer?: string;
  issued_at?: string;
  expires_at?: string;
  signature?: Signature;
  extensions?: Extensions;
}

export interface Security {
  authentication?: Authentication;
  encryption?: Encryption;
  attestation?: Attestation;
  extensions?: Extensions;
}

export interface Sanitization {
  enabled?: boolean;
  strip_html?: boolean;
  max_input_length?: number;
  extensions?: Extensions;
}

export interface InputHandling {
  max_input_length?: number;
  content_types?: string[];
  sanitization?: Sanitization;
  extensions?: Extensions;
}

export interface OutputHandling {
  max_output_length?: number;
  format?: OutputFormat;
  streaming?: boolean;
  extensions?: Extensions;
}

export interface RetryPolicy {
  max_retries?: number;
  backoff_strategy?: BackoffStrategy;
  initial_delay_ms?: number;
  max_delay_ms?: number;
  extensions?: Extensions;
}

export interface ToolInvocation {
  parallel?: boolean;
  max_concurrent?: number;
  timeout_ms?: number;
  retry_policy?: RetryPolicy;
  extensions?: Extensions;
}

export interface FallbackBehavior {
  action?: FallbackAction;
  default?: unknown;
  message?: string;
  extensions?: Extensions;
}

export interface ErrorHandling {
  on_tool_error?: ToolErrorAction;
  max_retries?: number;
  fallback_behavior?: FallbackBehavior;
  extensions?: Extensions;
}

export interface Runtime {
  input_handling?: InputHandling;
  output_handling?: OutputHandling;
  tool_invocation?: ToolInvocation;
  error_handling?: ErrorHandling;
  extensions?: Extensions;
}

export interface Author {
  name?: string;
  email?: string;
  url?: string;
  extensions?: Extensions;
}

export interface Metadata {
  authors?: Author[];
  license?: string;
  documentation?: string;
  repository?: string;
  tags?: string[];
  extensions?: Extensions;
}

export interface ADLDocument {
  adl_spec: string;
  $schema?: string;
  name: string;
  description: string;
  version: string;
  id?: string;
  data_classification: DataClassification;
  lifecycle?: Lifecycle;
  provider?: Provider;
  cryptographic_identity?: CryptographicIdentity;
  model?: ModelConfig;
  system_prompt?: SystemPrompt;
  tools?: Tool[];
  resources?: Resource[];
  prompts?: Prompt[];
  permissions?: Permissions;
  security?: Security;
  runtime?: Runtime;
  metadata?: Metadata;
  profiles?: string[];
  extensions?: Extensions;
}
