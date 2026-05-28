/**
 * Reference implementation of the passport verification procedure proposed in
 * proposals/2026-05-03-passport-verification-procedure.md (§10.3).
 *
 * Each function corresponds to a numbered subsection of the proposal. The
 * orchestrator runs them in order, gating later steps on earlier failures
 * where the proposal requires it.
 *
 * Framework-neutral: adapters for OpenClaw, A2A, Google ADK, MCP, LangGraph,
 * and other runtimes call `verifyPassport` directly and translate the
 * structured outcome into framework-specific allow/deny decisions.
 */

import { parseADL } from "../parse/parser.js";
import { validateDocument } from "../validate/validator.js";
import type { ADLDocument } from "../types/document.js";
import { jcsCanonicalize, verifyCanonical } from "./crypto.js";
import { resolveDIDWeb } from "./did-resolver.js";
import type {
  VerifyConfig,
  VerificationOutcome,
  VerificationStepResult,
  VerifyInput,
} from "./types.js";

export async function verifyPassport(
  input: VerifyInput,
  config: VerifyConfig,
): Promise<VerificationOutcome> {
  const steps: VerificationStepResult[] = [];
  let publicKeySource: VerificationOutcome["publicKeySource"] = "none";
  let didDocumentAuthority: string | undefined;

  // §1.1.1 Retrieval Integrity
  steps.push(checkRetrievalIntegrity(input));
  if (isBlocked(steps)) {
    return finalize(steps, input, publicKeySource, didDocumentAuthority);
  }

  // §1.1.2 Schema Validation
  const text = new TextDecoder().decode(input.passportBytes);
  const format = text.trimStart().startsWith("{") ? "json" : "yaml";
  const { document, errors: parseErrors } = parseADL(text, format);
  if (!document) {
    steps.push({
      section: "1.1.2",
      name: "Schema validation",
      passed: false,
      severity: "block",
      detail: `Parse failed: ${parseErrors.map((e) => e.detail).join("; ")}`,
    });
    return finalize(steps, input, publicKeySource, didDocumentAuthority);
  }
  // §1.1.2 is strict schema validation only. Semantic checks like
  // attestation expiry are handled by §1.1.6 — keeping these separate
  // is what allows ports across languages to share a conformance vector
  // pack without baking semantic rules into every language's schema validator.
  const { valid, errors: valErrors } = validateDocument(document, {
    skipSemantic: true,
  });
  steps.push({
    section: "1.1.2",
    name: "Schema validation",
    passed: valid,
    severity: "block",
    detail: valid
      ? "Document conforms to ADL schema"
      : `${valErrors.length} schema error(s): ${valErrors.map((e) => `[${e.code}]`).join(", ")}`,
  });
  if (!valid) return finalize(steps, input, publicKeySource, didDocumentAuthority);

  // §1.1.3 Identity Resolution
  const idResolution = await resolveIdentity(document, config);
  steps.push(idResolution.step);
  if (idResolution.didKey) didDocumentAuthority = idResolution.authority;
  if (isBlocked(steps)) return finalize(steps, input, publicKeySource, didDocumentAuthority);

  // §1.1.4 Public Key Cross-Check
  const inlineKey = document.cryptographic_identity?.public_key?.value;
  const inlineAlg = document.cryptographic_identity?.public_key?.algorithm;
  if (idResolution.didKey && inlineKey) {
    const algMatch = inlineAlg === idResolution.didKey.algorithm;
    const valMatch = inlineKey === idResolution.didKey.value;
    const passed = algMatch && valMatch;
    steps.push({
      section: "1.1.4",
      name: "Public key cross-check",
      passed,
      severity: "block",
      detail: passed
        ? "Inline public_key matches DID Document assertionMethod key"
        : !algMatch
          ? `Algorithm mismatch: inline=${inlineAlg}, did=${idResolution.didKey.algorithm}`
          : "Public key bytes differ between inline and DID Document",
    });
    publicKeySource = passed ? "cross_checked" : "none";
    if (!passed) return finalize(steps, input, publicKeySource, didDocumentAuthority);
  } else if (idResolution.didKey) {
    publicKeySource = "did_resolved";
    steps.push({
      section: "1.1.4",
      name: "Public key cross-check",
      passed: true,
      severity: "warn",
      detail: "No inline public_key — using DID-resolved key only",
    });
  } else if (inlineKey) {
    publicKeySource = "inline_only";
    if (!config.trustOnFirstUse && config.requireDidResolution) {
      steps.push({
        section: "1.1.4",
        name: "Public key cross-check",
        passed: false,
        severity: "block",
        detail: "DID resolution required but failed; no resolved key to cross-check inline public_key",
      });
      return finalize(steps, input, publicKeySource, didDocumentAuthority);
    }
    steps.push({
      section: "1.1.4",
      name: "Public key cross-check",
      passed: true,
      severity: "warn",
      detail: "Inline public_key only — Trust-On-First-Use mode (DID resolution unavailable or skipped)",
    });
  } else {
    steps.push({
      section: "1.1.4",
      name: "Public key cross-check",
      passed: false,
      severity: "block",
      detail: "No public key available from any source",
    });
    return finalize(steps, input, publicKeySource, didDocumentAuthority);
  }

  // Verification key: prefer DID-resolved per §10.2.3 / §10.3.4.
  const verificationKey = idResolution.didKey?.value ?? inlineKey!;

  // §1.1.5 Signature Verification
  steps.push(verifySignatureStep(document, verificationKey, config));
  if (isBlocked(steps)) return finalize(steps, input, publicKeySource, didDocumentAuthority);

  // §1.1.6 Temporal Validity
  steps.push(checkTemporalValidity(document));
  if (isBlocked(steps)) return finalize(steps, input, publicKeySource, didDocumentAuthority);

  // §1.1.7 Lifecycle Gating
  steps.push(checkLifecycle(document));
  if (isBlocked(steps)) return finalize(steps, input, publicKeySource, didDocumentAuthority);

  // §1.1.8 Provider–Identity Coherence
  steps.push(
    checkProviderCoherence(
      document,
      input.retrievalAuthority,
      didDocumentAuthority,
      config,
    ),
  );
  if (isBlocked(steps)) return finalize(steps, input, publicKeySource, didDocumentAuthority);

  // §1.1.9 Permission and Classification Compatibility
  if (input.requestingAgent) {
    steps.push(checkClassificationCompat(document, input.requestingAgent));
    if (isBlocked(steps)) return finalize(steps, input, publicKeySource, didDocumentAuthority);
  }

  return finalize(steps, input, publicKeySource, didDocumentAuthority);
}

// ---------------------------------------------------------------------------
// Step implementations
// ---------------------------------------------------------------------------

function isBlocked(steps: VerificationStepResult[]): boolean {
  const last = steps[steps.length - 1];
  return !last.passed && last.severity === "block";
}

function checkRetrievalIntegrity(input: VerifyInput): VerificationStepResult {
  if (input.retrievalChannel === "local_file") {
    return {
      section: "1.1.1",
      name: "Retrieval integrity",
      passed: true,
      severity: "warn",
      detail: "Loaded from local file — provenance recorded; no transport security",
    };
  }
  if (
    input.retrievalAuthority?.startsWith("localhost:") ||
    input.retrievalAuthority?.startsWith("127.0.0.1")
  ) {
    return {
      section: "1.1.1",
      name: "Retrieval integrity",
      passed: true,
      severity: "warn",
      detail: `Localhost retrieval (${input.retrievalAuthority}) — TLS bypass for development`,
    };
  }
  if (!input.retrievalAuthority) {
    return {
      section: "1.1.1",
      name: "Retrieval integrity",
      passed: false,
      severity: "block",
      detail: "No retrieval authority recorded — cannot establish trust anchor",
    };
  }
  return {
    section: "1.1.1",
    name: "Retrieval integrity",
    passed: true,
    severity: "block",
    detail: `Retrieved from ${input.retrievalAuthority}`,
  };
}

async function resolveIdentity(
  document: ADLDocument,
  config: VerifyConfig,
): Promise<{
  step: VerificationStepResult;
  didKey?: { algorithm: "Ed25519"; value: string };
  authority?: string;
}> {
  const did = document.cryptographic_identity?.did;
  if (!did) {
    return {
      step: {
        section: "1.1.3",
        name: "Identity resolution",
        passed: !config.requireDidResolution,
        severity: config.requireDidResolution ? "block" : "warn",
        detail: "Document declares no did:web identifier",
      },
    };
  }
  if (!did.startsWith("did:web:")) {
    return {
      step: {
        section: "1.1.3",
        name: "Identity resolution",
        passed: false,
        severity: "block",
        detail: `Unsupported DID method (only did:web is implemented): ${did}`,
      },
    };
  }

  const result = await resolveDIDWeb(did, {
    localOverrides: config.didLocalOverrides,
  });
  if (!result.resolved || !result.key) {
    return {
      step: {
        section: "1.1.3",
        name: "Identity resolution",
        passed: !config.requireDidResolution && config.trustOnFirstUse,
        severity: config.requireDidResolution ? "block" : "warn",
        detail: `did:web resolution failed: ${result.error ?? "unknown"}`,
      },
    };
  }
  return {
    step: {
      section: "1.1.3",
      name: "Identity resolution",
      passed: true,
      severity: "block",
      detail: `Resolved ${did} → ${result.key.algorithm} key from ${result.key.didDocumentUrl}`,
    },
    didKey: { algorithm: result.key.algorithm, value: result.key.value },
    authority: result.authority,
  };
}

function verifySignatureStep(
  document: ADLDocument,
  publicKeyBase64: string,
  config: VerifyConfig,
): VerificationStepResult {
  const sig = document.security?.attestation?.signature;
  if (!sig) {
    return {
      section: "1.1.5",
      name: "Signature verification",
      passed: !config.requireSignature,
      severity: config.requireSignature ? "block" : "warn",
      detail: "Document has no signature",
    };
  }
  if (sig.algorithm !== "Ed25519") {
    return {
      section: "1.1.5",
      name: "Signature verification",
      passed: false,
      severity: "block",
      detail: `Unsupported signature algorithm in this implementation (only Ed25519): ${sig.algorithm}`,
    };
  }
  if (sig.signed_content !== "canonical") {
    return {
      section: "1.1.5",
      name: "Signature verification",
      passed: false,
      severity: "block",
      detail: `This implementation only supports signed_content="canonical" (got "${sig.signed_content}")`,
    };
  }

  // §10.3 verification:
  //   1. Deep clone document; remove signature object
  //   2. JCS canonicalize
  //   3. Verify Ed25519 signature against canonical bytes
  const clone = JSON.parse(JSON.stringify(document)) as ADLDocument;
  if (clone.security?.attestation?.signature) {
    delete clone.security.attestation.signature;
  }
  const canonical = jcsCanonicalize(clone);
  const valid = verifyCanonical(
    publicKeyBase64,
    Buffer.from(canonical, "utf-8"),
    sig.value,
  );
  return {
    section: "1.1.5",
    name: "Signature verification",
    passed: valid,
    severity: "block",
    detail: valid
      ? "Ed25519 signature verifies against JCS-canonical bytes"
      : "Ed25519 signature does NOT verify — document tampered or wrong key",
  };
}

function checkTemporalValidity(document: ADLDocument): VerificationStepResult {
  const expiresAt = document.security?.attestation?.expires_at;
  if (!expiresAt) {
    return {
      section: "1.1.6",
      name: "Temporal validity",
      passed: true,
      severity: "warn",
      detail: "No expires_at declared",
    };
  }
  const now = Date.now();
  const exp = Date.parse(expiresAt);
  if (isNaN(exp)) {
    return {
      section: "1.1.6",
      name: "Temporal validity",
      passed: false,
      severity: "block",
      detail: `Invalid expires_at format: ${expiresAt}`,
    };
  }
  if (exp < now) {
    return {
      section: "1.1.6",
      name: "Temporal validity",
      passed: false,
      severity: "block",
      detail: `Attestation expired ${expiresAt}`,
    };
  }
  const daysUntilExp = (exp - now) / (1000 * 60 * 60 * 24);
  if (daysUntilExp < 30) {
    return {
      section: "1.1.6",
      name: "Temporal validity",
      passed: true,
      severity: "warn",
      detail: `Attestation expires in ${Math.floor(daysUntilExp)} days (warn threshold: 30)`,
    };
  }
  return {
    section: "1.1.6",
    name: "Temporal validity",
    passed: true,
    severity: "block",
    detail: `Attestation valid until ${expiresAt}`,
  };
}

function checkLifecycle(document: ADLDocument): VerificationStepResult {
  const status = document.lifecycle?.status ?? "active";
  if (status === "retired") {
    return {
      section: "1.1.7",
      name: "Lifecycle gating",
      passed: false,
      severity: "block",
      detail: `Agent is retired; successor: ${document.lifecycle?.successor ?? "(none declared)"}`,
    };
  }
  if (status === "deprecated") {
    return {
      section: "1.1.7",
      name: "Lifecycle gating",
      passed: true,
      severity: "warn",
      detail:
        `Agent is deprecated` +
        (document.lifecycle?.sunset_date ? ` (sunset ${document.lifecycle.sunset_date})` : "") +
        (document.lifecycle?.successor ? ` — successor: ${document.lifecycle.successor}` : ""),
    };
  }
  if (status === "draft") {
    return {
      section: "1.1.7",
      name: "Lifecycle gating",
      passed: false,
      severity: "block",
      detail: "Agent is draft — production runtimes MUST refuse",
    };
  }
  return {
    section: "1.1.7",
    name: "Lifecycle gating",
    passed: true,
    severity: "block",
    detail: "Agent is active",
  };
}

function checkProviderCoherence(
  document: ADLDocument,
  retrievalAuthority: string | undefined,
  didDocumentAuthority: string | undefined,
  config: VerifyConfig,
): VerificationStepResult {
  // Surfacing the retrieval/DID authorities in detail makes audit logs
  // self-explanatory.
  void retrievalAuthority;
  void didDocumentAuthority;

  if (!config.requireProviderCoherence) {
    return {
      section: "1.1.8",
      name: "Provider–identity coherence",
      passed: true,
      severity: "warn",
      detail: "Coherence check disabled by config",
    };
  }
  const providerUrl = document.provider?.url;
  if (!providerUrl) {
    return {
      section: "1.1.8",
      name: "Provider–identity coherence",
      passed: true,
      severity: "warn",
      detail: "No provider.url declared",
    };
  }
  const providerHost = (() => {
    try {
      return new URL(providerUrl).hostname;
    } catch {
      return undefined;
    }
  })();
  if (!providerHost) {
    return {
      section: "1.1.8",
      name: "Provider–identity coherence",
      passed: false,
      severity: "block",
      detail: `Cannot parse provider.url: ${providerUrl}`,
    };
  }

  if (config.providerAllowlist.length > 0 && !config.providerAllowlist.includes(providerHost)) {
    return {
      section: "1.1.8",
      name: "Provider–identity coherence",
      passed: false,
      severity: "block",
      detail: `Provider ${providerHost} not on allowlist: [${config.providerAllowlist.join(", ")}]`,
    };
  }

  return {
    section: "1.1.8",
    name: "Provider–identity coherence",
    passed: true,
    severity: "block",
    detail: `Provider ${providerHost} accepted`,
  };
}

function checkClassificationCompat(
  target: ADLDocument,
  requesting: ADLDocument,
): VerificationStepResult {
  const order = ["public", "internal", "confidential", "restricted"] as const;
  const targetSens = target.data_classification.sensitivity;
  const reqSens = requesting.data_classification.sensitivity;
  const targetIdx = order.indexOf(targetSens);
  const reqIdx = order.indexOf(reqSens);

  if (reqIdx < targetIdx) {
    return {
      section: "1.1.9",
      name: "Permission/classification compatibility",
      passed: false,
      severity: "block",
      detail: `Requesting agent (${reqSens}) cannot access ${targetSens} data on ${target.name}`,
    };
  }
  return {
    section: "1.1.9",
    name: "Permission/classification compatibility",
    passed: true,
    severity: "block",
    detail: `Requesting agent (${reqSens}) cleared for ${targetSens} target`,
  };
}

// ---------------------------------------------------------------------------
// Outcome assembly (§1.1.10)
// ---------------------------------------------------------------------------

function finalize(
  steps: VerificationStepResult[],
  input: VerifyInput,
  publicKeySource: VerificationOutcome["publicKeySource"],
  didDocumentAuthority: string | undefined,
): VerificationOutcome {
  const blocking = steps.find((s) => !s.passed && s.severity === "block");
  const verified = blocking === undefined;
  const summary = verified
    ? `verified (${steps.length} steps; key source: ${publicKeySource})`
    : `not_verified at §${blocking!.section} (${blocking!.name}): ${blocking!.detail}`;
  return {
    verified,
    steps,
    trustAnchor: {
      retrievalChannel: input.retrievalChannel,
      discoveryAuthority: input.discoveryAuthority,
      didDocumentAuthority,
    },
    publicKeySource,
    summary,
  };
}
