/**
 * Cryptographic primitives for ADL passport signing and verification.
 *
 * Implements the algorithms required by ADL spec §10.2 and the verification
 * procedure proposed in §10.3:
 *   - Ed25519 keypair generation, sign, verify
 *   - JCS canonicalization (RFC 8785) for `signed_content: "canonical"`
 *   - Base64url encoding helpers (RFC 4648 §5)
 *
 * Uses Node.js built-in crypto so no external dependencies are needed.
 * Ed25519 is RECOMMENDED by §10.3.
 */

import {
  createPrivateKey,
  createPublicKey,
  generateKeyPairSync,
  sign as cryptoSign,
  verify as cryptoVerify,
} from "node:crypto";

export interface KeyPair {
  /** Base64-encoded raw 32-byte Ed25519 public key */
  publicKey: string;
  /** PKCS#8 PEM-encoded Ed25519 private key */
  privateKeyPem: string;
}

/**
 * Generate a fresh Ed25519 keypair suitable for ADL `cryptographic_identity.public_key`.
 * The public key is the raw 32-byte form, Base64-encoded — the format required
 * by the spec's `public_key.value` field. The private key is in PKCS#8 PEM
 * for portable storage.
 */
export function generateKeyPair(): KeyPair {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");

  // Ed25519 raw public key is the last 32 bytes of the SPKI export.
  const spkiDer = publicKey.export({ format: "der", type: "spki" });
  const rawPublicKey = spkiDer.subarray(spkiDer.length - 32);

  return {
    publicKey: rawPublicKey.toString("base64"),
    privateKeyPem: privateKey.export({ format: "pem", type: "pkcs8" }).toString(),
  };
}

/**
 * Sign canonical bytes with an Ed25519 private key (PKCS#8 PEM).
 * Returns a Base64url-encoded signature matching the spec's
 * `signature.value` encoding.
 */
export function signCanonical(privateKeyPem: string, data: Uint8Array): string {
  const keyObject = createPrivateKey(privateKeyPem);
  return base64UrlEncode(cryptoSign(null, data, keyObject));
}

/**
 * Verify an Ed25519 signature against a raw public key (Base64-encoded).
 * Accepts a Base64url-encoded signature value.
 */
export function verifyCanonical(
  publicKeyBase64: string,
  data: Uint8Array,
  signatureBase64Url: string,
): boolean {
  const rawKey = Buffer.from(publicKeyBase64, "base64");
  if (rawKey.length !== 32) return false;

  // Reconstruct an SPKI DER from the raw 32-byte Ed25519 key. The 12-byte
  // prefix below is the constant SPKI header for Ed25519.
  const spkiPrefix = Buffer.from([
    0x30, 0x2a, 0x30, 0x05, 0x06, 0x03, 0x2b, 0x65, 0x70, 0x03, 0x21, 0x00,
  ]);
  const spkiDer = Buffer.concat([spkiPrefix, rawKey]);

  const keyObject = createPublicKey({
    key: spkiDer,
    format: "der",
    type: "spki",
  });

  return cryptoVerify(null, data, keyObject, base64UrlDecode(signatureBase64Url));
}

/**
 * Serialize a value per RFC 8785 (JSON Canonicalization Scheme).
 *
 * Implements the subset that ADL passports use: strings, integers, booleans,
 * null, arrays, and objects with sorted keys. Per spec §18, ADL implementations
 * SHOULD avoid floating-point in signed fields, so RFC 8785 §3.2.2.2 number
 * serialization is not implemented.
 */
export function jcsCanonicalize(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error("JCS does not permit non-finite numbers");
    }
    if (Number.isInteger(value)) return value.toString(10);
    return JSON.stringify(value);
  }
  if (typeof value === "string") return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map(jcsCanonicalize).join(",")}]`;
  }
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    // RFC 8785 §3.2.3: object members are sorted by UTF-16 code unit order.
    const keys = Object.keys(obj).sort();
    const members = keys.map(
      (k) => `${JSON.stringify(k)}:${jcsCanonicalize(obj[k])}`,
    );
    return `{${members.join(",")}}`;
  }
  throw new Error(`JCS cannot canonicalize value of type ${typeof value}`);
}

// ---------------------------------------------------------------------------
// Base64url helpers (RFC 4648 §5)
// ---------------------------------------------------------------------------

export function base64UrlEncode(buf: Uint8Array | Buffer): string {
  return Buffer.from(buf).toString("base64url");
}

export function base64UrlDecode(s: string): Buffer {
  return Buffer.from(s, "base64url");
}
