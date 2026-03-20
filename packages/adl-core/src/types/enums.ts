/**
 * Literal union types derived from ADL spec schema definitions.
 */

export type Sensitivity = "public" | "internal" | "confidential" | "restricted";

export type DataCategory =
  | "pii"
  | "phi"
  | "financial"
  | "credentials"
  | "intellectual_property"
  | "regulatory";

export type LifecycleStatus = "draft" | "active" | "deprecated" | "retired";

export type AuthType = "none" | "api_key" | "oauth2" | "oidc" | "mtls";

export type AttestationType = "self" | "third_party" | "verifiable_credential";

export type SignedContent = "canonical" | "digest";

export type ModelCapability =
  | "function_calling"
  | "vision"
  | "code_execution"
  | "streaming";

export type ResourceType =
  | "vector_store"
  | "knowledge_base"
  | "file"
  | "api"
  | "database";

export type FileAccess = "read" | "write" | "read_write";

export type OutputFormat = "text" | "json" | "markdown" | "html";

export type ToolErrorAction = "abort" | "continue" | "retry";

export type FallbackAction = "return_error" | "use_default" | "skip";

export type BackoffStrategy = "fixed" | "exponential" | "linear";
