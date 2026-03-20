/**
 * Semantic rules: ADL-2019, ADL-4001, ADL-4002, ADL-4003
 * Validates signature digest fields, key algorithms, and attestation expiry.
 */

import type { ADLDocument } from "../../types/document.js";
import { createError, type ADLError } from "../../types/errors.js";

/**
 * Algorithms considered weak per spec Section 6.3:
 * "Implementations SHOULD reject weak algorithms (e.g., RSA below 2048 bits,
 * DSA, ECDSA below P-256). EdDSA (Ed25519, Ed448) is RECOMMENDED."
 *
 * We flag known-weak algorithm names. Since the ADL document only contains
 * the algorithm name (not key length), we flag algorithms that are inherently
 * weak or commonly associated with weak configurations.
 */
const WEAK_ALGORITHMS = new Set([
  "dsa",
  "rsa1024",
  "rsa-1024",
  "md5",
  "sha1",
  "sha-1",
]);

/**
 * Algorithms that may be weak depending on key size.
 * We can only warn based on the name — we don't have key metadata.
 */
const SUSPECT_ALGORITHMS = new Set([
  "rs256",
  "rs384",
]);

export function checkSecurity(doc: ADLDocument): ADLError[] {
  const errors: ADLError[] = [];

  const attestation = doc.security?.attestation;
  const signature = attestation?.signature;

  // ADL-2019: Missing digest fields for digest-mode signature
  if (signature?.signed_content === "digest") {
    if (!signature.digest_algorithm) {
      errors.push(
        createError(
          "ADL-2019",
          'Signature signed_content is "digest" but digest_algorithm is missing',
          { pointer: "/security/attestation/signature/digest_algorithm" },
        ),
      );
    }
    if (!signature.digest_value) {
      errors.push(
        createError(
          "ADL-2019",
          'Signature signed_content is "digest" but digest_value is missing',
          { pointer: "/security/attestation/signature/digest_value" },
        ),
      );
    }
  }

  // ADL-4001: Weak key algorithm
  const publicKey = doc.cryptographic_identity?.public_key;
  if (publicKey?.algorithm) {
    const algoLower = publicKey.algorithm.toLowerCase();
    if (WEAK_ALGORITHMS.has(algoLower)) {
      errors.push(
        createError(
          "ADL-4001",
          `Algorithm "${publicKey.algorithm}" does not meet minimum strength requirements. EdDSA (Ed25519, Ed448) is recommended`,
          { pointer: "/cryptographic_identity/public_key/algorithm" },
        ),
      );
    }
  }

  // Also check attestation signature algorithm
  if (signature?.algorithm) {
    const algoLower = signature.algorithm.toLowerCase();
    if (WEAK_ALGORITHMS.has(algoLower)) {
      errors.push(
        createError(
          "ADL-4001",
          `Signature algorithm "${signature.algorithm}" does not meet minimum strength requirements`,
          { pointer: "/security/attestation/signature/algorithm" },
        ),
      );
    }
  }

  // ADL-4002: Invalid signature — structural validation
  // Full cryptographic verification is out of scope for a document validator.
  // We check that required fields are present when a signature object exists.
  if (
    attestation?.signature !== undefined &&
    typeof attestation.signature === "object"
  ) {
    const sig = attestation.signature;
    if (!sig.algorithm) {
      errors.push(
        createError(
          "ADL-4002",
          "Signature object is missing required field: algorithm",
          { pointer: "/security/attestation/signature/algorithm" },
        ),
      );
    }
    if (!sig.value) {
      errors.push(
        createError(
          "ADL-4002",
          "Signature object is missing required field: value",
          { pointer: "/security/attestation/signature/value" },
        ),
      );
    }
    if (!sig.signed_content) {
      errors.push(
        createError(
          "ADL-4002",
          "Signature object is missing required field: signed_content",
          { pointer: "/security/attestation/signature/signed_content" },
        ),
      );
    }
  }

  // ADL-4003: Expired attestation
  if (attestation?.expires_at) {
    const expiresAt = new Date(attestation.expires_at);
    if (!isNaN(expiresAt.getTime()) && expiresAt < new Date()) {
      errors.push(
        createError(
          "ADL-4003",
          `Attestation expired at ${attestation.expires_at}`,
          { pointer: "/security/attestation/expires_at" },
        ),
      );
    }
  }

  return errors;
}
