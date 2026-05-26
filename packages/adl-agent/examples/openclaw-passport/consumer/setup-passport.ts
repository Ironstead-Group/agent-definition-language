#!/usr/bin/env bun
/**
 * Consumer Passport Setup
 *
 * Scenario: A consumer runs OpenClaw on a Mac Mini (or any local machine)
 * and wants their personal agent to present a verifiable passport whenever
 * it interacts with other agents.
 *
 * This script:
 *   1. Generates an Ed25519 keypair
 *   2. Builds an ADL passport with HTTPS id, did:web identifier, and inline public key
 *   3. Validates the passport against the @adl-spec/core schema
 *   4. Signs the passport per spec §10.2 using JCS canonicalization
 *   5. Writes the signed passport to disk as YAML
 *   6. Writes a DID Document for the consumer's did:web identifier so verifiers
 *      can resolve the public key per the verification procedure proposal §10.3.1.3
 *
 * Output files:
 *   - consumer-agent.adl.yaml  (the signed passport)
 *   - consumer.did.json        (the DID Document, served at /.well-known/did.json)
 *   - consumer.private.pem     (private key — stored locally for re-signing demos)
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { stringify as yamlStringify } from "yaml";
import {
  validateDocument,
  generateKeyPair,
  buildPassport,
  signPassport,
  buildDIDDocument,
} from "@adl-spec/core";

const dir = import.meta.dir;
const PASSPORT_PATH = path.join(dir, "consumer-agent.adl.yaml");
const DID_DOC_PATH = path.join(dir, "consumer.did.json");
const PRIVATE_KEY_PATH = path.join(dir, "consumer.private.pem");

// In a real Mac Mini deployment these would be the user's actual domain.
// For the demo they're synthetic — the enterprise gateway / validator
// resolve them via localhost overrides.
const CONSUMER_DOMAIN = "home.local";
const CONSUMER_AGENT_PATH = "agents/personal-assistant";
const CONSUMER_ID = `https://${CONSUMER_DOMAIN}/${CONSUMER_AGENT_PATH}`;
const CONSUMER_DID = `did:web:${CONSUMER_DOMAIN}:agents:personal-assistant`;

function logStep(n: number, label: string) {
  console.log(`\n[setup] Step ${n}: ${label}`);
  console.log(`[setup] ${"-".repeat(40 + label.length)}`);
}

async function main() {
  console.log("Consumer Passport Setup");
  console.log("=======================");
  console.log(
    "This script provisions an ADL passport for a consumer-hosted",
  );
  console.log(
    "OpenClaw agent (e.g. on a Mac Mini). The output is a signed",
  );
  console.log(
    "passport plus a DID Document that other agents can resolve to",
  );
  console.log(
    "verify the passport's signature.",
  );

  // 1. Key generation
  logStep(1, "Generate Ed25519 keypair (spec §6.3)");
  const { publicKey, privateKeyPem } = generateKeyPair();
  console.log(`[setup] Public key (base64, 32 bytes): ${publicKey}`);
  console.log(
    `[setup] Private key written to ${path.basename(PRIVATE_KEY_PATH)} (PKCS#8 PEM)`,
  );

  // 2. Build passport
  logStep(2, "Build ADL passport (spec §6.1, §6.3, §9, §10)");
  const unsigned = buildPassport({
    name: "Personal Assistant",
    description:
      "A consumer AI assistant running on a local Mac Mini via OpenClaw. " +
      "Presents this passport when interacting with other agents.",
    version: "1.0.0",
    id: CONSUMER_ID,
    did: CONSUMER_DID,
    publicKey,
    sensitivity: "internal",
    provider: {
      name: "Home Lab",
      url: `https://${CONSUMER_DOMAIN}`,
      contact: "user@home.local",
    },
    allowedHosts: [
      "agents.acme.example",
      "registry.acme.example",
    ],
  });
  console.log(`[setup] id:  ${unsigned.id}`);
  console.log(`[setup] did: ${unsigned.cryptographic_identity?.did}`);
  console.log(
    `[setup] data_classification.sensitivity: ${unsigned.data_classification.sensitivity}`,
  );
  console.log(
    `[setup] lifecycle.status: ${unsigned.lifecycle?.status}`,
  );

  // 3. Validate
  logStep(3, "Validate passport against ADL schema");
  const { valid, errors } = validateDocument(unsigned);
  if (!valid) {
    console.error("[setup] Validation failed:");
    for (const e of errors) console.error(`  [${e.code}] ${e.detail}`);
    process.exit(1);
  }
  console.log(`[setup] Schema validation: PASSED`);

  // 4. Sign
  logStep(4, "Sign passport via JCS canonicalization (spec §10.2)");
  const signed = signPassport(unsigned, privateKeyPem);
  console.log(
    `[setup] Signature algorithm: ${signed.security?.attestation?.signature?.algorithm}`,
  );
  console.log(
    `[setup] Signed content mode: ${signed.security?.attestation?.signature?.signed_content}`,
  );
  console.log(
    `[setup] Signature value (base64url, first 32 chars): ${signed.security?.attestation?.signature?.value.slice(0, 32)}...`,
  );

  // 5. Build DID Document (proposed §10.3.1.3)
  logStep(5, "Build did:web DID Document for the consumer");
  const didDoc = buildDIDDocument(CONSUMER_DID, publicKey);
  console.log(`[setup] DID Document id: ${didDoc.id}`);
  console.log(
    `[setup] assertionMethod: ${JSON.stringify(didDoc.assertionMethod)}`,
  );

  // 6. Write outputs
  logStep(6, "Write outputs to disk");
  const yamlOut = yamlStringify(signed);
  fs.writeFileSync(PASSPORT_PATH, yamlOut, "utf-8");
  fs.writeFileSync(DID_DOC_PATH, JSON.stringify(didDoc, null, 2), "utf-8");
  fs.writeFileSync(PRIVATE_KEY_PATH, privateKeyPem, { mode: 0o600 });
  console.log(`[setup] Wrote ${path.basename(PASSPORT_PATH)} (${yamlOut.length} bytes)`);
  console.log(
    `[setup] Wrote ${path.basename(DID_DOC_PATH)} (${JSON.stringify(didDoc).length} bytes)`,
  );
  console.log(
    `[setup] Wrote ${path.basename(PRIVATE_KEY_PATH)} (private key, mode 0600)`,
  );

  console.log("\n[setup] DONE.\n");
  console.log("Next steps:");
  console.log(
    "  - The consumer's gateway (consumer-config.json) loads consumer-agent.adl.yaml.",
  );
  console.log(
    "  - When the consumer agent calls another agent, it attaches the passport",
  );
  console.log(
    "    in an X-ADL-Passport header. The receiving platform runs the",
  );
  console.log(
    "    verification procedure (§10.3) and either allows or rejects the request.",
  );
}

main().catch((err) => {
  console.error("[setup] Fatal:", err);
  process.exit(1);
});
