/**
 * did:web resolver.
 *
 * Implements the resolution procedure required by the verification proposal
 * §1.1.3 ([proposals/2026-05-03-passport-verification-procedure.md]):
 *   - did:web:{domain}             → https://{domain}/.well-known/did.json
 *   - did:web:{domain}:{path...}   → https://{domain}/{path...}/did.json
 *
 * Extracts the public key designated by the DID Document's
 * `assertionMethod` verification relationship (per W3C DID Core).
 */

export interface DIDDocument {
  id: string;
  verificationMethod?: VerificationMethod[];
  assertionMethod?: (string | VerificationMethod)[];
}

export interface VerificationMethod {
  id: string;
  type: string;
  controller: string;
  publicKeyMultibase?: string;
  publicKeyJwk?: {
    kty: string;
    crv?: string;
    x?: string;
  };
  /**
   * Non-standard but practical: a raw Base64-encoded public key. Used by the
   * ADL reference implementation to keep DID Documents self-contained without
   * requiring a multibase or JWK toolchain. Conformant verifiers SHOULD also
   * accept publicKeyMultibase and publicKeyJwk.
   */
  publicKeyBase64?: string;
}

export interface ResolvedKey {
  algorithm: "Ed25519";
  /** Base64-encoded raw 32-byte public key */
  value: string;
  source: "did_document";
  didDocumentUrl: string;
}

export interface DIDResolutionResult {
  resolved: boolean;
  key?: ResolvedKey;
  error?: string;
  /** Domain authority that served the DID Document (for §1.1.8 coherence checks) */
  authority?: string;
}

export interface ResolveOptions {
  /**
   * Localhost overrides for `did:web` resolution. Maps the DID's domain
   * segment to a base URL. Used by tests and local development to avoid
   * provisioning real DNS/TLS for synthetic identifiers.
   */
  localOverrides?: Record<string, string>;
  /** Override the global fetch (e.g., for tests) */
  fetchImpl?: typeof fetch;
}

/**
 * Convert a `did:web` identifier to its resolution URL per the did:web method spec.
 *
 *   did:web:home.local                    → https://home.local/.well-known/did.json
 *   did:web:home.local:agents:assistant   → https://home.local/agents/assistant/did.json
 */
export function didWebToUrl(
  did: string,
  localOverrides?: Record<string, string>,
): string {
  if (!did.startsWith("did:web:")) {
    throw new Error(`Not a did:web identifier: ${did}`);
  }
  const segments = did.slice("did:web:".length).split(":").map(decodeURIComponent);
  const [domain, ...pathSegments] = segments;
  const baseUrl = localOverrides?.[domain] ?? `https://${domain}`;

  return pathSegments.length === 0
    ? `${baseUrl}/.well-known/did.json`
    : `${baseUrl}/${pathSegments.join("/")}/did.json`;
}

export async function resolveDIDWeb(
  did: string,
  options: ResolveOptions = {},
): Promise<DIDResolutionResult> {
  let url: string;
  try {
    url = didWebToUrl(did, options.localOverrides);
  } catch (e) {
    return { resolved: false, error: (e as Error).message };
  }

  const fetchFn = options.fetchImpl ?? fetch;

  let res: Response;
  try {
    res = await fetchFn(url);
  } catch (e) {
    return {
      resolved: false,
      error: `Failed to fetch DID Document at ${url}: ${(e as Error).message}`,
    };
  }

  if (!res.ok) {
    return {
      resolved: false,
      error: `DID Document fetch returned HTTP ${res.status} for ${url}`,
    };
  }

  let didDoc: DIDDocument;
  try {
    didDoc = (await res.json()) as DIDDocument;
  } catch (e) {
    return {
      resolved: false,
      error: `DID Document is not valid JSON: ${(e as Error).message}`,
    };
  }

  const key = extractAssertionMethodKey(didDoc);
  if (!key) {
    return {
      resolved: false,
      error: "DID Document has no resolvable assertionMethod public key",
    };
  }

  return {
    resolved: true,
    key: { ...key, source: "did_document", didDocumentUrl: url },
    authority: new URL(url).host,
  };
}

function extractAssertionMethodKey(
  doc: DIDDocument,
): { algorithm: "Ed25519"; value: string } | undefined {
  const candidates: VerificationMethod[] = [];

  for (const entry of doc.assertionMethod ?? []) {
    if (typeof entry === "string") {
      const resolved = doc.verificationMethod?.find((m) => m.id === entry);
      if (resolved) candidates.push(resolved);
    } else {
      candidates.push(entry);
    }
  }
  // Fallback to first verificationMethod when assertionMethod is absent.
  if (candidates.length === 0 && doc.verificationMethod?.length) {
    candidates.push(doc.verificationMethod[0]);
  }

  for (const m of candidates) {
    if (m.publicKeyBase64) {
      return { algorithm: "Ed25519", value: m.publicKeyBase64 };
    }
    if (
      m.publicKeyJwk?.kty === "OKP" &&
      m.publicKeyJwk.crv === "Ed25519" &&
      m.publicKeyJwk.x
    ) {
      const x = m.publicKeyJwk.x;
      const b64 = x
        .replace(/-/g, "+")
        .replace(/_/g, "/")
        .padEnd(Math.ceil(x.length / 4) * 4, "=");
      return { algorithm: "Ed25519", value: b64 };
    }
  }
  return undefined;
}

/**
 * Build a minimal DID Document for an Ed25519 keypair, suitable for serving
 * at the well-known location. Used by passport publishers to expose a
 * resolvable DID Document for verifiers.
 */
export function buildDIDDocument(
  did: string,
  publicKeyBase64: string,
): DIDDocument {
  const keyId = `${did}#key-1`;
  return {
    id: did,
    verificationMethod: [
      {
        id: keyId,
        type: "Ed25519VerificationKey2020",
        controller: did,
        publicKeyBase64,
      },
    ],
    assertionMethod: [keyId],
  };
}
