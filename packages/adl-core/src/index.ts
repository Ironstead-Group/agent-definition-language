/**
 * @adl-spec/core — Reference implementation and SDK for the Agent Definition Language.
 */

// Types
export type {
  ADLDocument,
  DataClassification,
  Lifecycle,
  Provider,
  CryptographicIdentity,
  PublicKey,
  ModelConfig,
  SystemPrompt,
  SystemPromptTemplate,
  Tool,
  ToolExample,
  ToolAnnotations,
  Resource,
  Prompt,
  Permissions,
  NetworkPermissions,
  FilesystemPermissions,
  FilesystemPath,
  EnvironmentPermissions,
  ExecutionPermissions,
  ResourceLimits,
  Security,
  Authentication,
  Encryption,
  EncryptionConfig,
  EncryptionAtRest,
  Attestation,
  Signature,
  Runtime,
  InputHandling,
  OutputHandling,
  ToolInvocation,
  RetryPolicy,
  ErrorHandling,
  FallbackBehavior,
  Sanitization,
  Metadata,
  Author,
  Extensions,
} from "./types/document.js";

export type {
  Sensitivity,
  DataCategory,
  LifecycleStatus,
  AuthType,
  AttestationType,
  SignedContent,
  ModelCapability,
  ResourceType,
  FileAccess,
  OutputFormat,
  ToolErrorAction,
  FallbackAction,
  BackoffStrategy,
} from "./types/enums.js";

export type {
  ADLError,
  ADLErrorSource,
  ADLErrorReport,
} from "./types/errors.js";

export { ADL_ERRORS, createError, formatErrorsJSON } from "./types/errors.js";

export type {
  A2AAgentCard,
  A2ASkill,
  A2AProvider,
  A2AAuthentication,
  MCPServerConfig,
  MCPTool,
  MCPResource,
  MCPPrompt,
  MCPPromptArgument,
} from "./types/converters.js";

// Parse
export { parseADL } from "./parse/parser.js";
export type { ParseResult } from "./parse/parser.js";
export { loadADL, loadADLSync } from "./parse/loader.js";

// Validate
export { validateDocument } from "./validate/validator.js";
export type { ValidateOptions, ValidationResult } from "./validate/validator.js";

// Convert
export { convertToA2A } from "./convert/a2a.js";
export { convertToMCP } from "./convert/mcp.js";

// Verify (passport verification procedure per proposed §10.3)
export { verifyPassport } from "./verify/verify.js";
export {
  generateKeyPair,
  signCanonical,
  verifyCanonical,
  jcsCanonicalize,
  base64UrlEncode,
  base64UrlDecode,
} from "./verify/crypto.js";
export type { KeyPair } from "./verify/crypto.js";
export {
  resolveDIDWeb,
  didWebToUrl,
  buildDIDDocument,
} from "./verify/did-resolver.js";
export type {
  DIDDocument,
  VerificationMethod,
  DIDResolutionResult,
  ResolvedKey,
  ResolveOptions,
} from "./verify/did-resolver.js";
export {
  fetchDiscoveryDocument,
  fetchPassportFromUrl,
  discoverAndFetchAll,
} from "./verify/discovery.js";
export type {
  DiscoveryAgent,
  DiscoveryDocument,
  DiscoveredPassport,
} from "./verify/discovery.js";
export { buildPassport, signPassport } from "./verify/builder.js";
export type { BuildPassportInput } from "./verify/builder.js";
export type {
  EnforcementMode,
  VerificationStepResult,
  VerificationOutcome,
  VerifyConfig,
  VerifyInput,
} from "./verify/types.js";
export { DEFAULT_VERIFY_CONFIG } from "./verify/types.js";

// Schema registry
export {
  getSchema,
  isSupportedVersion,
  SUPPORTED_VERSIONS,
} from "./schemas/registry.js";

// Type guard
export { isADLDocument } from "./guards.js";
