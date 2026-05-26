/**
 * Enterprise ADL Gateway
 *
 * Scenario: An enterprise onboards multiple agents and serves them via the
 * well-known discovery endpoint (spec §6.4) so other agents can find them.
 *
 * Endpoints:
 *   GET /.well-known/adl-agents               — Discovery document (§6.4)
 *   GET /agents/:slug                          — ADL passport (application/adl+json)
 *   GET /agents/:slug/did.json                 — DID Document (per verification proposal §10.3.1.3)
 *   GET /adl/governance                        — Governance summary (lifecycle, classification, perms)
 *
 * At startup the gateway:
 *   1. Loads each YAML passport from agents/
 *   2. Validates against the ADL schema
 *   3. Provisions an Ed25519 keypair for each (in-memory; demo only)
 *   4. Replaces the placeholder public_key with the provisioned key
 *   5. Signs each passport via JCS canonicalization (§10.3)
 *   6. Builds a DID Document for each agent's did:web identifier
 *   7. Refuses to register agents whose lifecycle.status is "retired" (§5.6)
 *
 * Production deployments would use durable keys from a KMS or HSM, not
 * regenerate them on every gateway start.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { stringify as yamlStringify } from "yaml";
import {
  loadADLSync,
  validateDocument,
  generateKeyPair,
  signPassport,
  buildDIDDocument,
  type ADLDocument,
  type DIDDocument,
} from "@adl-spec/core";

const PORT = parseInt(process.env.ENTERPRISE_PORT ?? "3002", 10);
const dir = import.meta.dir;
const AGENTS_DIR = path.join(dir, "agents");

interface RegisteredAgent {
  slug: string;
  passport: ADLDocument;
  passportYaml: string;
  publicKey: string;
  privateKeyPem: string;
  didDocument: DIDDocument;
}

function deriveSlug(p: ADLDocument): string {
  // Use the last path segment of the id URL.
  if (p.id?.startsWith("https://")) {
    const u = new URL(p.id);
    const seg = u.pathname.split("/").filter(Boolean);
    return seg[seg.length - 1] ?? p.name.toLowerCase().replace(/\s+/g, "-");
  }
  return p.name.toLowerCase().replace(/\s+/g, "-");
}

function loadAndProvision(): RegisteredAgent[] {
  const files = fs
    .readdirSync(AGENTS_DIR)
    .filter((f) => f.endsWith(".adl.yaml"));

  const registered: RegisteredAgent[] = [];

  for (const file of files) {
    const fullPath = path.join(AGENTS_DIR, file);
    console.log(`[enterprise] Loading ${file}`);

    const { document, errors } = loadADLSync(fullPath);
    if (!document || errors.length > 0) {
      console.error(`[enterprise]   FAILED to parse: ${errors.map((e) => e.detail).join(", ")}`);
      continue;
    }

    // Lifecycle gating per §5.6 (and verification proposal §10.3.1.7)
    const status = document.lifecycle?.status ?? "active";
    if (status === "retired") {
      console.error(
        `[enterprise]   REFUSING to register retired agent: ${document.name}`,
      );
      continue;
    }
    if (status === "deprecated") {
      const sunset = document.lifecycle?.sunset_date;
      const successor = document.lifecycle?.successor;
      console.warn(
        `[enterprise]   WARNING: ${document.name} is deprecated` +
          (sunset ? ` (sunset ${sunset})` : "") +
          (successor ? ` — successor: ${successor}` : ""),
      );
    }
    if (status === "draft" && process.env.ADL_DEV_MODE !== "true") {
      console.error(
        `[enterprise]   REFUSING to register draft agent (set ADL_DEV_MODE=true to allow): ${document.name}`,
      );
      continue;
    }

    // Provision keypair + sign
    const { publicKey, privateKeyPem } = generateKeyPair();
    if (document.cryptographic_identity?.public_key) {
      document.cryptographic_identity.public_key.value = publicKey;
    }
    const signed = signPassport(document, privateKeyPem);

    // Validate after substitution
    const { valid, errors: valErrors } = validateDocument(signed);
    if (!valid) {
      console.error(
        `[enterprise]   VALIDATION FAILED: ${valErrors.map((e) => `[${e.code}] ${e.detail}`).join(", ")}`,
      );
      continue;
    }

    const slug = deriveSlug(signed);
    const did = signed.cryptographic_identity?.did;
    if (!did) {
      console.error(`[enterprise]   skipping ${file}: missing did`);
      continue;
    }

    registered.push({
      slug,
      passport: signed,
      passportYaml: yamlStringify(signed),
      publicKey,
      privateKeyPem,
      didDocument: buildDIDDocument(did, publicKey),
    });

    console.log(
      `[enterprise]   Registered ${signed.name} v${signed.version} (status=${status}, did=${did})`,
    );
  }

  return registered;
}

const registered = loadAndProvision();
if (registered.length === 0) {
  console.error("[enterprise] No agents registered. Exiting.");
  process.exit(1);
}

// Build DID-Document path map. did:web:agents.acme.example:invoice-processor
// resolves to https://agents.acme.example/invoice-processor/did.json.
// For the demo (localhost) we serve under /agents/:slug/did.json.
const bySlug = new Map<string, RegisteredAgent>();
for (const r of registered) bySlug.set(r.slug, r);

function buildDiscoveryDocument(baseUrl: string) {
  return {
    adl_discovery: "1.0",
    agents: registered.map((r) => ({
      id: r.passport.id,
      adl_document: `${baseUrl}/agents/${r.slug}`,
      name: r.passport.name,
      version: r.passport.version,
      description: r.passport.description,
      status: r.passport.lifecycle?.status ?? "active",
    })),
  };
}

function buildGovernanceSummary() {
  return {
    agents: registered.map((r) => ({
      id: r.passport.id,
      name: r.passport.name,
      version: r.passport.version,
      lifecycle: r.passport.lifecycle,
      data_classification: r.passport.data_classification,
      cryptographic_identity: {
        did: r.passport.cryptographic_identity?.did,
        algorithm: r.passport.cryptographic_identity?.public_key?.algorithm,
      },
      attestation: {
        type: r.passport.security?.attestation?.type,
        issuer: r.passport.security?.attestation?.issuer,
        expires_at: r.passport.security?.attestation?.expires_at,
      },
      permissions_summary: {
        allowed_hosts: r.passport.permissions?.network?.allowed_hosts ?? [],
        max_memory_mb: r.passport.permissions?.resource_limits?.max_memory_mb,
      },
    })),
  };
}

const server = Bun.serve({
  port: PORT,
  fetch(req) {
    const url = new URL(req.url);
    const baseUrl = `${url.protocol}//${url.host}`;

    // Discovery (§6.4)
    if (req.method === "GET" && url.pathname === "/.well-known/adl-agents") {
      return Response.json(buildDiscoveryDocument(baseUrl), {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=300",
        },
      });
    }

    // Governance summary
    if (req.method === "GET" && url.pathname === "/adl/governance") {
      return Response.json(buildGovernanceSummary());
    }

    // Per-agent passport
    const passportMatch = url.pathname.match(/^\/agents\/([^/]+)$/);
    if (req.method === "GET" && passportMatch) {
      const agent = bySlug.get(passportMatch[1]);
      if (!agent) return Response.json({ error: "Not found" }, { status: 404 });
      return new Response(agent.passportYaml, {
        headers: { "Content-Type": "application/adl+json" },
      });
    }

    // Per-agent DID Document. The did:web spec resolves
    // did:web:agents.acme.example:invoice-processor to
    // https://agents.acme.example/invoice-processor/did.json. For the demo
    // we serve under /agents/:slug/did.json so localhost mapping works.
    const didMatch = url.pathname.match(/^\/agents\/([^/]+)\/did\.json$/);
    if (req.method === "GET" && didMatch) {
      const agent = bySlug.get(didMatch[1]);
      if (!agent) return Response.json({ error: "Not found" }, { status: 404 });
      return Response.json(agent.didDocument);
    }

    return Response.json({ error: "Not found" }, { status: 404 });
  },
});

console.log(`[enterprise] Listening on http://localhost:${PORT}`);
console.log(
  `[enterprise]   Discovery:  http://localhost:${PORT}/.well-known/adl-agents`,
);
console.log(
  `[enterprise]   Governance: http://localhost:${PORT}/adl/governance`,
);
for (const r of registered) {
  console.log(
    `[enterprise]   Passport:   http://localhost:${PORT}/agents/${r.slug}`,
  );
  console.log(
    `[enterprise]   DID Doc:    http://localhost:${PORT}/agents/${r.slug}/did.json`,
  );
}

// Keep the server reference reachable so Bun does not GC it.
void server;
