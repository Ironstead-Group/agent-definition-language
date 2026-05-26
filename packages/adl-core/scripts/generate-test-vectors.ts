#!/usr/bin/env bun
/**
 * Generate the verify test vector pack at
 *   versions/draft/test-vectors/verify/vectors/
 *
 * This script is the canonical source of how each vector is constructed.
 * Re-run only when adding new vectors or when the §10.3 procedure
 * changes in a way that requires regenerating signatures.
 *
 * The script:
 *   1. Reads (or generates if absent) deterministic test keypairs from
 *      versions/draft/test-vectors/verify/test-keys.json
 *   2. Builds passport, DID Document, and config combinations for each
 *      vector
 *   3. Signs passports per §10.2 using the test keys
 *   4. Writes the resulting vectors as JSON files
 *
 * The vectors themselves contain no hidden state — every signature, key,
 * and resolution response is embedded in the JSON. Other implementations
 * (Python, Go, Rust) consume the JSON directly and do not run this script.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import {
  buildPassport,
  signPassport,
  generateKeyPair,
  buildDIDDocument,
  type ADLDocument,
  type DIDDocument,
  type VerifyConfig,
  DEFAULT_VERIFY_CONFIG,
} from "../src/index.js";

const REPO_ROOT = path.resolve(import.meta.dir, "../../..");
const VECTORS_DIR = path.join(
  REPO_ROOT,
  "versions/draft/test-vectors/verify",
);
const KEYS_PATH = path.join(VECTORS_DIR, "test-keys.json");
const OUT_DIR = path.join(VECTORS_DIR, "vectors");

// ---------------------------------------------------------------------------
// Test keys
// ---------------------------------------------------------------------------

interface TestKeyEntry {
  public_key: string;
  private_key_pem: string;
}

interface TestKeys {
  consumer: TestKeyEntry;
  enterprise: TestKeyEntry;
  imposter: TestKeyEntry;
}

function toOnDiskShape(kp: { publicKey: string; privateKeyPem: string }): TestKeyEntry {
  return { public_key: kp.publicKey, private_key_pem: kp.privateKeyPem };
}

function loadOrGenerateKeys(): TestKeys {
  if (fs.existsSync(KEYS_PATH)) {
    const raw = JSON.parse(fs.readFileSync(KEYS_PATH, "utf-8")) as Record<
      string,
      TestKeyEntry
    >;
    return {
      consumer: raw.consumer,
      enterprise: raw.enterprise,
      imposter: raw.imposter,
    };
  }
  console.log(`[generator] ${KEYS_PATH} not found; generating fresh keys`);
  const keys: TestKeys = {
    consumer: toOnDiskShape(generateKeyPair()),
    enterprise: toOnDiskShape(generateKeyPair()),
    imposter: toOnDiskShape(generateKeyPair()),
  };
  const onDisk = {
    _comment:
      "Test keys for the verify test vector pack. Do not use in production.",
    consumer: keys.consumer,
    enterprise: keys.enterprise,
    imposter: keys.imposter,
  };
  fs.writeFileSync(KEYS_PATH, JSON.stringify(onDisk, null, 2));
  return keys;
}

const keys = loadOrGenerateKeys();

// ---------------------------------------------------------------------------
// Vector schema (mirrors SCHEMA.md)
// ---------------------------------------------------------------------------

interface ExpectedStepOutcome {
  section: string;
  passed: boolean;
  severity: "block" | "warn";
}

interface TestVector {
  id: string;
  description: string;
  spec_sections: string[];
  input: {
    passport: ADLDocument;
    passport_format?: "json" | "yaml";
    retrieval: {
      channel: "discovery" | "direct_url" | "header" | "local_file";
      authority?: string | null;
      discovery_authority?: string | null;
    };
    requesting_agent?: ADLDocument | null;
    did_resolution_responses?: Record<
      string,
      { status: number; body: unknown }
    >;
  };
  config: VerifyConfig;
  expected: {
    verified: boolean;
    public_key_source: "inline_only" | "did_resolved" | "cross_checked" | "none";
    blocked_at_section: string | null;
    step_outcomes: ExpectedStepOutcome[];
  };
}

// ---------------------------------------------------------------------------
// Reusable passport builders
// ---------------------------------------------------------------------------

const ISSUED = "2026-04-01T00:00:00.000Z";
const VALID_EXPIRES = "2027-04-01T00:00:00.000Z";

function consumerInput(overrides: Partial<Parameters<typeof buildPassport>[0]> = {}) {
  return {
    name: "Personal Assistant",
    description: "Consumer agent for verification test vectors",
    version: "1.0.0",
    id: "https://test.example/agents/personal-assistant",
    did: "did:web:test.example:agents:personal-assistant",
    publicKey: keys.consumer.public_key,
    sensitivity: "internal" as const,
    provider: {
      name: "Test Org",
      url: "https://test.example",
      contact: "test@test.example",
    },
    allowedHosts: ["api.test.example"],
    issuedAt: ISSUED,
    expiresAt: VALID_EXPIRES,
    tags: ["consumer", "test"],
    ...overrides,
  };
}

function enterpriseInput(overrides: Partial<Parameters<typeof buildPassport>[0]> = {}) {
  return consumerInput({
    name: "Enterprise Agent",
    description: "Enterprise agent for verification test vectors",
    id: "https://acme.example/agents/enterprise",
    did: "did:web:acme.example:agents:enterprise",
    publicKey: keys.enterprise.public_key,
    sensitivity: "confidential" as const,
    provider: {
      name: "Acme",
      url: "https://acme.example",
      contact: "platform@acme.example",
    },
    allowedHosts: ["api.acme.example"],
    ...overrides,
  });
}

const consumerDIDUrl =
  "https://test.example/agents/personal-assistant/did.json";
const enterpriseDIDUrl = "https://acme.example/agents/enterprise/did.json";

function consumerDIDDocument(overridePublicKey?: string): DIDDocument {
  return buildDIDDocument(
    "did:web:test.example:agents:personal-assistant",
    overridePublicKey ?? keys.consumer.public_key,
  );
}

function defaultConfig(overrides: Partial<VerifyConfig> = {}): VerifyConfig {
  return { ...DEFAULT_VERIFY_CONFIG, ...overrides };
}

// ---------------------------------------------------------------------------
// Vector builders
// ---------------------------------------------------------------------------

const vectors: TestVector[] = [];

function addVector(v: TestVector) {
  vectors.push(v);
}

// 001 — happy path: self-signed inline key, TOFU
{
  const signed = signPassport(buildPassport(consumerInput()), keys.consumer.private_key_pem);
  addVector({
    id: "001-valid-self-signed-tofu",
    description:
      "Self-signed passport with inline Ed25519 key passes verification under Trust-On-First-Use (no DID resolution).",
    spec_sections: ["10.3.1.1", "10.3.1.2", "10.3.1.4", "10.3.1.5", "10.3.1.6", "10.3.1.7"],
    input: {
      passport: signed,
      retrieval: { channel: "header", authority: "localhost:3000" },
    },
    config: defaultConfig(),
    expected: {
      verified: true,
      public_key_source: "inline_only",
      blocked_at_section: null,
      step_outcomes: [
        { section: "10.3.1.1", passed: true, severity: "warn" },
        { section: "10.3.1.2", passed: true, severity: "block" },
        { section: "10.3.1.4", passed: true, severity: "warn" },
        { section: "10.3.1.5", passed: true, severity: "block" },
        { section: "10.3.1.6", passed: true, severity: "block" },
        { section: "10.3.1.7", passed: true, severity: "block" },
      ],
    },
  });
}

// 002 — happy path: DID-resolved key matches inline (cross-checked)
{
  const signed = signPassport(buildPassport(consumerInput()), keys.consumer.private_key_pem);
  addVector({
    id: "002-valid-did-resolved-cross-checked",
    description:
      "Passport with did:web identifier resolves to a DID Document whose key matches the inline public key. Verification succeeds with cross_checked key source.",
    spec_sections: ["10.3.1.3", "10.3.1.4"],
    input: {
      passport: signed,
      retrieval: { channel: "header", authority: "localhost:3000" },
      did_resolution_responses: {
        [consumerDIDUrl]: {
          status: 200,
          body: consumerDIDDocument(),
        },
      },
    },
    config: defaultConfig({ requireDidResolution: true }),
    expected: {
      verified: true,
      public_key_source: "cross_checked",
      blocked_at_section: null,
      step_outcomes: [
        { section: "10.3.1.3", passed: true, severity: "block" },
        { section: "10.3.1.4", passed: true, severity: "block" },
        { section: "10.3.1.5", passed: true, severity: "block" },
      ],
    },
  });
}

// 003 — local file retrieval
{
  const signed = signPassport(buildPassport(consumerInput()), keys.consumer.private_key_pem);
  addVector({
    id: "003-retrieval-local-file",
    description:
      "Passport loaded from a local file passes §10.3.1.1 with a warn-level outcome (provenance recorded; no transport security).",
    spec_sections: ["10.3.1.1"],
    input: {
      passport: signed,
      retrieval: { channel: "local_file" },
    },
    config: defaultConfig(),
    expected: {
      verified: true,
      public_key_source: "inline_only",
      blocked_at_section: null,
      step_outcomes: [{ section: "10.3.1.1", passed: true, severity: "warn" }],
    },
  });
}

// 004 — retrieval missing authority
{
  const signed = signPassport(buildPassport(consumerInput()), keys.consumer.private_key_pem);
  addVector({
    id: "004-retrieval-missing-authority",
    description:
      "Passport retrieved over network without a recorded authority MUST fail §10.3.1.1 — no trust anchor can be established.",
    spec_sections: ["10.3.1.1"],
    input: {
      passport: signed,
      retrieval: { channel: "header", authority: null },
    },
    config: defaultConfig(),
    expected: {
      verified: false,
      public_key_source: "none",
      blocked_at_section: "10.3.1.1",
      step_outcomes: [{ section: "10.3.1.1", passed: false, severity: "block" }],
    },
  });
}

// 010 — schema validation: missing required field
{
  const signed = signPassport(buildPassport(consumerInput()), keys.consumer.private_key_pem);
  // Drop the required `version` field
  const broken = JSON.parse(JSON.stringify(signed)) as ADLDocument;
  // @ts-expect-error intentionally invalid
  delete broken.version;
  addVector({
    id: "010-schema-missing-required-field",
    description:
      "Passport missing the required `version` field MUST fail schema validation at §10.3.2.",
    spec_sections: ["10.3.1.2"],
    input: {
      passport: broken,
      retrieval: { channel: "header", authority: "localhost:3000" },
    },
    config: defaultConfig(),
    expected: {
      verified: false,
      public_key_source: "none",
      blocked_at_section: "10.3.1.2",
      step_outcomes: [
        { section: "10.3.1.1", passed: true, severity: "warn" },
        { section: "10.3.1.2", passed: false, severity: "block" },
      ],
    },
  });
}

// 011 — schema validation: invalid sensitivity enum
{
  const signed = signPassport(buildPassport(consumerInput()), keys.consumer.private_key_pem);
  const broken = JSON.parse(JSON.stringify(signed)) as ADLDocument;
  // @ts-expect-error intentionally invalid enum value
  broken.data_classification.sensitivity = "ultra_secret";
  addVector({
    id: "011-schema-invalid-sensitivity-enum",
    description:
      "Passport with non-enum `data_classification.sensitivity` value MUST fail schema validation.",
    spec_sections: ["10.3.1.2"],
    input: {
      passport: broken,
      retrieval: { channel: "header", authority: "localhost:3000" },
    },
    config: defaultConfig(),
    expected: {
      verified: false,
      public_key_source: "none",
      blocked_at_section: "10.3.1.2",
      step_outcomes: [
        { section: "10.3.1.2", passed: false, severity: "block" },
      ],
    },
  });
}

// 020 — DID resolution: 404
{
  const signed = signPassport(buildPassport(consumerInput()), keys.consumer.private_key_pem);
  addVector({
    id: "020-did-resolution-404",
    description:
      "DID Document fetch returns 404. With requireDidResolution=true and trustOnFirstUse=false, the verifier MUST block at §10.3.3.",
    spec_sections: ["10.3.1.3"],
    input: {
      passport: signed,
      retrieval: { channel: "header", authority: "localhost:3000" },
      did_resolution_responses: {
        [consumerDIDUrl]: { status: 404, body: { error: "not_found" } },
      },
    },
    config: defaultConfig({
      requireDidResolution: true,
      trustOnFirstUse: false,
    }),
    expected: {
      verified: false,
      public_key_source: "none",
      blocked_at_section: "10.3.1.3",
      step_outcomes: [
        { section: "10.3.1.3", passed: false, severity: "block" },
      ],
    },
  });
}

// 021 — DID Document missing assertionMethod
{
  const signed = signPassport(buildPassport(consumerInput()), keys.consumer.private_key_pem);
  const malformedDid: DIDDocument = {
    id: "did:web:test.example:agents:personal-assistant",
    verificationMethod: [],
    assertionMethod: [],
  };
  addVector({
    id: "021-did-document-no-assertion-method",
    description:
      "DID Document has no resolvable assertionMethod public key. With requireDidResolution=true, MUST block at §10.3.3.",
    spec_sections: ["10.3.1.3"],
    input: {
      passport: signed,
      retrieval: { channel: "header", authority: "localhost:3000" },
      did_resolution_responses: {
        [consumerDIDUrl]: { status: 200, body: malformedDid },
      },
    },
    config: defaultConfig({
      requireDidResolution: true,
      trustOnFirstUse: false,
    }),
    expected: {
      verified: false,
      public_key_source: "none",
      blocked_at_section: "10.3.1.3",
      step_outcomes: [
        { section: "10.3.1.3", passed: false, severity: "block" },
      ],
    },
  });
}

// 022 — Unsupported DID method
{
  const unsigned = buildPassport(consumerInput());
  if (unsigned.cryptographic_identity) {
    unsigned.cryptographic_identity.did = "did:key:z6MkfZ6S2EXAMPLE";
  }
  const signed = signPassport(unsigned, keys.consumer.private_key_pem);
  addVector({
    id: "022-did-method-unsupported",
    description:
      "Passport declares a non-did:web identifier. The reference implementation only supports did:web; verification MUST block at §10.3.3.",
    spec_sections: ["10.3.1.3"],
    input: {
      passport: signed,
      retrieval: { channel: "header", authority: "localhost:3000" },
    },
    config: defaultConfig(),
    expected: {
      verified: false,
      public_key_source: "none",
      blocked_at_section: "10.3.1.3",
      step_outcomes: [
        { section: "10.3.1.3", passed: false, severity: "block" },
      ],
    },
  });
}

// 030 — Inline key disagrees with DID-resolved key
{
  // Sign with consumer's key, but the DID Document publishes the imposter's key.
  const signed = signPassport(buildPassport(consumerInput()), keys.consumer.private_key_pem);
  addVector({
    id: "030-key-mismatch-inline-vs-did",
    description:
      "Inline public_key does not match the key resolved from the DID Document. MUST block at §10.3.4.",
    spec_sections: ["10.3.1.4"],
    input: {
      passport: signed,
      retrieval: { channel: "header", authority: "localhost:3000" },
      did_resolution_responses: {
        [consumerDIDUrl]: {
          status: 200,
          body: consumerDIDDocument(keys.imposter.public_key),
        },
      },
    },
    config: defaultConfig({ requireDidResolution: true }),
    expected: {
      verified: false,
      public_key_source: "none",
      blocked_at_section: "10.3.1.4",
      step_outcomes: [
        { section: "10.3.1.3", passed: true, severity: "block" },
        { section: "10.3.1.4", passed: false, severity: "block" },
      ],
    },
  });
}

// 040 — Signature tampered post-signing
{
  const signed = signPassport(buildPassport(consumerInput()), keys.consumer.private_key_pem);
  // Tamper: append an extra allowed_host AFTER signing
  signed.permissions!.network!.allowed_hosts = [
    ...(signed.permissions!.network!.allowed_hosts ?? []),
    "evil.example",
  ];
  addVector({
    id: "040-signature-tampered-post-signing",
    description:
      "Passport modified after signing (added allowed_host). The signature MUST fail verification at §10.3.5.",
    spec_sections: ["10.3.1.5"],
    input: {
      passport: signed,
      retrieval: { channel: "header", authority: "localhost:3000" },
    },
    config: defaultConfig(),
    expected: {
      verified: false,
      public_key_source: "inline_only",
      blocked_at_section: "10.3.1.5",
      step_outcomes: [
        { section: "10.3.1.5", passed: false, severity: "block" },
      ],
    },
  });
}

// 041 — Missing signature with requireSignature=true
{
  const unsigned = buildPassport(consumerInput());
  addVector({
    id: "041-signature-missing-when-required",
    description:
      "Passport has no signature; requireSignature=true MUST block at §10.3.5.",
    spec_sections: ["10.3.1.5"],
    input: {
      passport: unsigned,
      retrieval: { channel: "header", authority: "localhost:3000" },
    },
    config: defaultConfig({ requireSignature: true }),
    expected: {
      verified: false,
      public_key_source: "inline_only",
      blocked_at_section: "10.3.1.5",
      step_outcomes: [
        { section: "10.3.1.5", passed: false, severity: "block" },
      ],
    },
  });
}

// 042 — Wrong signing key
{
  // Sign with imposter's key but advertise consumer's public key.
  const unsigned = buildPassport(consumerInput());
  const signed = signPassport(unsigned, keys.imposter.private_key_pem);
  addVector({
    id: "042-signature-wrong-key",
    description:
      "Passport signed by a key that does not match the inline public_key. MUST block at §10.3.1.5 (signature does not verify).",
    spec_sections: ["10.3.1.5"],
    input: {
      passport: signed,
      retrieval: { channel: "header", authority: "localhost:3000" },
    },
    config: defaultConfig(),
    expected: {
      verified: false,
      public_key_source: "inline_only",
      blocked_at_section: "10.3.1.5",
      step_outcomes: [
        { section: "10.3.1.5", passed: false, severity: "block" },
      ],
    },
  });
}

// 050 — Attestation expired (caught at §10.3.1.6 temporal validity)
{
  const expired = signPassport(
    buildPassport(consumerInput({ expiresAt: "2024-01-01T00:00:00.000Z" })),
    keys.consumer.private_key_pem,
  );
  addVector({
    id: "050-attestation-expired",
    description:
      "Passport with expires_at in the past. §10.3.1.2 is structural-only (passes), and §10.3.1.6 catches the expiry. This separation is what allows language ports to share the conformance pack — semantic rules are not baked into per-language schema validators.",
    spec_sections: ["10.3.1.6"],
    input: {
      passport: expired,
      retrieval: { channel: "header", authority: "localhost:3000" },
    },
    config: defaultConfig(),
    expected: {
      verified: false,
      public_key_source: "inline_only",
      blocked_at_section: "10.3.1.6",
      step_outcomes: [
        { section: "10.3.1.2", passed: true, severity: "block" },
        { section: "10.3.1.5", passed: true, severity: "block" },
        { section: "10.3.1.6", passed: false, severity: "block" },
      ],
    },
  });
}

// 051 — Near-expiry (warn)
{
  // Compute a date 10 days from now to force the warn branch deterministically.
  // Note: this vector's "near expiry" status is time-relative. The expected
  // outcome captures the structural truth: §10.3.1.6 must produce a warn
  // result (passed=true, severity=warn) when expiry is within 30 days.
  // Implementations evaluating this vector at a date AFTER the embedded
  // expires_at will see §10.3.1.6 fail instead — vectors with relative
  // semantics are inherently time-bounded. Regenerate when stale.
  const tenDays = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString();
  const signed = signPassport(
    buildPassport(consumerInput({ expiresAt: tenDays })),
    keys.consumer.private_key_pem,
  );
  addVector({
    id: "051-attestation-near-expiry-warn",
    description:
      "Passport with expires_at within 30 days produces a §10.3.1.6 warn-level outcome (passed=true, severity=warn). Time-relative — regenerate when stale.",
    spec_sections: ["10.3.1.6"],
    input: {
      passport: signed,
      retrieval: { channel: "header", authority: "localhost:3000" },
    },
    config: defaultConfig(),
    expected: {
      verified: true,
      public_key_source: "inline_only",
      blocked_at_section: null,
      step_outcomes: [
        { section: "10.3.1.6", passed: true, severity: "warn" },
      ],
    },
  });
}

// 060 — Lifecycle: retired
{
  const unsigned = buildPassport(consumerInput());
  unsigned.lifecycle = {
    ...unsigned.lifecycle!,
    status: "retired",
    successor: "https://test.example/agents/successor",
  };
  const signed = signPassport(unsigned, keys.consumer.private_key_pem);
  addVector({
    id: "060-lifecycle-retired",
    description:
      "Passport with lifecycle.status='retired' MUST be blocked at §10.3.7. Successor URI is reported in the detail.",
    spec_sections: ["10.3.1.7"],
    input: {
      passport: signed,
      retrieval: { channel: "header", authority: "localhost:3000" },
    },
    config: defaultConfig(),
    expected: {
      verified: false,
      public_key_source: "inline_only",
      blocked_at_section: "10.3.1.7",
      step_outcomes: [
        { section: "10.3.1.7", passed: false, severity: "block" },
      ],
    },
  });
}

// 061 — Lifecycle: deprecated (warn)
{
  const unsigned = buildPassport(consumerInput());
  unsigned.lifecycle = {
    ...unsigned.lifecycle!,
    status: "deprecated",
    sunset_date: "2027-01-01T00:00:00.000Z",
    successor: "https://test.example/agents/v2",
  };
  const signed = signPassport(unsigned, keys.consumer.private_key_pem);
  addVector({
    id: "061-lifecycle-deprecated-warn",
    description:
      "Passport with lifecycle.status='deprecated' produces a §10.3.1.7 warn outcome but still verifies overall.",
    spec_sections: ["10.3.1.7"],
    input: {
      passport: signed,
      retrieval: { channel: "header", authority: "localhost:3000" },
    },
    config: defaultConfig(),
    expected: {
      verified: true,
      public_key_source: "inline_only",
      blocked_at_section: null,
      step_outcomes: [
        { section: "10.3.1.7", passed: true, severity: "warn" },
      ],
    },
  });
}

// 062 — Lifecycle: draft
{
  const unsigned = buildPassport(consumerInput());
  unsigned.lifecycle = { ...unsigned.lifecycle!, status: "draft" };
  const signed = signPassport(unsigned, keys.consumer.private_key_pem);
  addVector({
    id: "062-lifecycle-draft-blocked",
    description:
      "Passport with lifecycle.status='draft' MUST be blocked at §10.3.1.7 — production runtimes refuse draft agents.",
    spec_sections: ["10.3.1.7"],
    input: {
      passport: signed,
      retrieval: { channel: "header", authority: "localhost:3000" },
    },
    config: defaultConfig(),
    expected: {
      verified: false,
      public_key_source: "inline_only",
      blocked_at_section: "10.3.1.7",
      step_outcomes: [
        { section: "10.3.1.7", passed: false, severity: "block" },
      ],
    },
  });
}

// 070 — Provider not on allowlist
{
  const signed = signPassport(buildPassport(consumerInput()), keys.consumer.private_key_pem);
  addVector({
    id: "070-provider-not-allowlisted",
    description:
      "requireProviderCoherence=true with a provider_allowlist that does not include the passport's provider host MUST block at §10.3.8.",
    spec_sections: ["10.3.1.8"],
    input: {
      passport: signed,
      retrieval: { channel: "header", authority: "localhost:3000" },
    },
    config: defaultConfig({
      requireProviderCoherence: true,
      providerAllowlist: ["other.example"],
    }),
    expected: {
      verified: false,
      public_key_source: "inline_only",
      blocked_at_section: "10.3.1.8",
      step_outcomes: [
        { section: "10.3.1.8", passed: false, severity: "block" },
      ],
    },
  });
}

// 071 — Provider on allowlist
{
  const signed = signPassport(buildPassport(consumerInput()), keys.consumer.private_key_pem);
  addVector({
    id: "071-provider-allowlisted",
    description:
      "requireProviderCoherence=true with the passport's provider host on the allowlist MUST pass §10.3.8.",
    spec_sections: ["10.3.1.8"],
    input: {
      passport: signed,
      retrieval: { channel: "header", authority: "localhost:3000" },
    },
    config: defaultConfig({
      requireProviderCoherence: true,
      providerAllowlist: ["test.example"],
    }),
    expected: {
      verified: true,
      public_key_source: "inline_only",
      blocked_at_section: null,
      step_outcomes: [
        { section: "10.3.1.8", passed: true, severity: "block" },
      ],
    },
  });
}

// 080 — Classification: requesting agent too low
{
  // Target is confidential, requesting agent is public
  const target = signPassport(
    buildPassport(enterpriseInput({ sensitivity: "confidential" })),
    keys.enterprise.private_key_pem,
  );
  const requesting = signPassport(
    buildPassport(consumerInput({ sensitivity: "public" })),
    keys.consumer.private_key_pem,
  );
  addVector({
    id: "080-classification-requesting-too-low",
    description:
      "Requesting agent's data_classification.sensitivity (public) is lower than the target agent's (confidential). MUST block at §10.3.9.",
    spec_sections: ["10.3.1.9"],
    input: {
      passport: target,
      retrieval: { channel: "header", authority: "localhost:3000" },
      requesting_agent: requesting,
    },
    config: defaultConfig(),
    expected: {
      verified: false,
      public_key_source: "inline_only",
      blocked_at_section: "10.3.1.9",
      step_outcomes: [
        { section: "10.3.1.9", passed: false, severity: "block" },
      ],
    },
  });
}

// 081 — Classification: requesting agent equal
{
  const target = signPassport(
    buildPassport(enterpriseInput({ sensitivity: "internal" })),
    keys.enterprise.private_key_pem,
  );
  const requesting = signPassport(
    buildPassport(consumerInput({ sensitivity: "internal" })),
    keys.consumer.private_key_pem,
  );
  addVector({
    id: "081-classification-requesting-equal",
    description:
      "Requesting agent's classification equals the target's. MUST pass §10.3.9.",
    spec_sections: ["10.3.1.9"],
    input: {
      passport: target,
      retrieval: { channel: "header", authority: "localhost:3000" },
      requesting_agent: requesting,
    },
    config: defaultConfig(),
    expected: {
      verified: true,
      public_key_source: "inline_only",
      blocked_at_section: null,
      step_outcomes: [
        { section: "10.3.1.9", passed: true, severity: "block" },
      ],
    },
  });
}

// 082 — Classification: requesting agent higher
{
  const target = signPassport(
    buildPassport(enterpriseInput({ sensitivity: "public" })),
    keys.enterprise.private_key_pem,
  );
  const requesting = signPassport(
    buildPassport(consumerInput({ sensitivity: "restricted" })),
    keys.consumer.private_key_pem,
  );
  addVector({
    id: "082-classification-requesting-higher",
    description:
      "Requesting agent's classification (restricted) exceeds the target's (public). MUST pass §10.3.9.",
    spec_sections: ["10.3.1.9"],
    input: {
      passport: target,
      retrieval: { channel: "header", authority: "localhost:3000" },
      requesting_agent: requesting,
    },
    config: defaultConfig(),
    expected: {
      verified: true,
      public_key_source: "inline_only",
      blocked_at_section: null,
      step_outcomes: [
        { section: "10.3.1.9", passed: true, severity: "block" },
      ],
    },
  });
}

// ---------------------------------------------------------------------------
// Write vectors to disk
// ---------------------------------------------------------------------------

if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

// Clear any stale files from previous runs
for (const f of fs.readdirSync(OUT_DIR)) {
  if (f.endsWith(".json")) fs.unlinkSync(path.join(OUT_DIR, f));
}

for (const v of vectors) {
  const filename = `${v.id}.json`;
  fs.writeFileSync(
    path.join(OUT_DIR, filename),
    JSON.stringify(v, null, 2) + "\n",
  );
  console.log(`[generator] wrote ${filename}`);
}

console.log(`[generator] generated ${vectors.length} vector(s) in ${OUT_DIR}`);
