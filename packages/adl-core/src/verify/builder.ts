/**
 * Programmatic ADL passport construction and signing.
 *
 * `buildPassport` produces a fully-formed ADLDocument from a structured input.
 * `signPassport` adds a cryptographic signature per spec §10.3 by JCS-canonicalizing
 * the document (with any prior signature stripped) and signing the canonical bytes.
 */

import type { ADLDocument } from "../types/document.js";
import { jcsCanonicalize, signCanonical } from "./crypto.js";

export interface BuildPassportInput {
  name: string;
  description: string;
  version: string;
  /** HTTPS URI per spec §6.1 */
  id: string;
  /** did:web identifier per spec §6.1 */
  did: string;
  /** Base64-encoded raw 32-byte Ed25519 public key */
  publicKey: string;
  sensitivity: "public" | "internal" | "confidential" | "restricted";
  provider: { name: string; url: string; contact: string };
  allowedHosts: string[];
  /** ISO 8601 timestamp; defaults to now */
  issuedAt?: string;
  /** ISO 8601 timestamp; defaults to issuedAt + 1 year */
  expiresAt?: string;
  /** Tags for `metadata.tags` */
  tags?: string[];
}

export function buildPassport(input: BuildPassportInput): ADLDocument {
  const issuedAt = input.issuedAt ?? new Date().toISOString();
  const expiresAt =
    input.expiresAt ??
    new Date(Date.parse(issuedAt) + 365 * 24 * 60 * 60 * 1000).toISOString();

  return {
    adl_spec: "0.2.0",
    name: input.name,
    description: input.description,
    version: input.version,
    id: input.id,
    data_classification: { sensitivity: input.sensitivity },
    lifecycle: { status: "active", effective_date: issuedAt },
    provider: input.provider,
    cryptographic_identity: {
      did: input.did,
      public_key: { algorithm: "Ed25519", value: input.publicKey },
    },
    permissions: {
      network: {
        allowed_hosts: input.allowedHosts,
        allowed_protocols: ["https"],
        deny_private: false,
      },
      resource_limits: { max_memory_mb: 1024, max_duration_sec: 120 },
    },
    security: {
      authentication: { type: "api_key", required: true },
      encryption: { in_transit: { required: true, min_version: "1.2" } },
      attestation: {
        type: "self",
        issued_at: issuedAt,
        expires_at: expiresAt,
      },
    },
    metadata: {
      license: "MIT",
      tags: input.tags ?? [],
    },
  };
}

/**
 * Sign a passport per spec §10.3:
 *   1. Remove any existing `security.attestation.signature`
 *   2. Serialize via JCS (RFC 8785)
 *   3. Sign canonical bytes with Ed25519
 *   4. Insert a `signature` object with algorithm, value, signed_content="canonical"
 *
 * The verifier reverses this: removes the signature, runs JCS, and verifies
 * the resulting canonical bytes.
 */
export function signPassport(
  doc: ADLDocument,
  privateKeyPem: string,
): ADLDocument {
  // Defensive deep clone so the caller's input is not mutated.
  const clone: ADLDocument = JSON.parse(JSON.stringify(doc));

  if (clone.security?.attestation?.signature) {
    delete clone.security.attestation.signature;
  }

  const canonical = jcsCanonicalize(clone);
  const signatureValue = signCanonical(
    privateKeyPem,
    Buffer.from(canonical, "utf-8"),
  );

  if (!clone.security) clone.security = {};
  if (!clone.security.attestation) {
    throw new Error("Passport must declare security.attestation before signing");
  }

  clone.security.attestation.signature = {
    algorithm: "Ed25519",
    value: signatureValue,
    signed_content: "canonical",
  };

  return clone;
}
