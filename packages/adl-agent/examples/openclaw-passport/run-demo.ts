#!/usr/bin/env bun
/**
 * OpenClaw Passport Demo Orchestrator
 *
 * Runs all three scenarios end-to-end:
 *   1. Consumer setup    — generates a consumer passport on a Mac Mini-like host
 *   2. Enterprise gateway — onboards three enterprise agents and serves discovery
 *   3. Platform validator — runs the full §10.3 verification procedure on requests
 *
 * Then exercises four request scenarios against the validator:
 *   - Valid consumer passport → proxied to enterprise gateway
 *   - Tampered passport       → blocked at §10.3.1.5 (signature)
 *   - Expired attestation      → blocked at §10.3.1.6 (temporal)
 *   - Retired lifecycle        → blocked at §10.3.1.7 (lifecycle)
 *
 * Ports (configurable via env):
 *   ENTERPRISE_PORT=3002 — enterprise gateway
 *   VALIDATOR_PORT=3003  — platform validator
 */

import { spawn, execSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import { stringify as yamlStringify } from "yaml";
import { parseADL, signPassport } from "@adl-spec/core";

const dir = import.meta.dir;
const ENTERPRISE_PORT = process.env.ENTERPRISE_PORT ?? "3002";
const VALIDATOR_PORT = process.env.VALIDATOR_PORT ?? "3003";
const ENTERPRISE_URL = `http://localhost:${ENTERPRISE_PORT}`;
const VALIDATOR_URL = `http://localhost:${VALIDATOR_PORT}`;

function freePort(port: string) {
  try {
    const pid = execSync(`lsof -ti tcp:${port} 2>/dev/null`, { encoding: "utf-8" }).trim();
    if (pid) {
      execSync(`kill ${pid} 2>/dev/null`);
      execSync("sleep 0.3");
    }
  } catch {
    // not in use
  }
}

async function waitForServer(url: string, maxAttempts = 30): Promise<void> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      // not ready
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`Server at ${url} did not start in time`);
}

function banner(title: string) {
  const bar = "=".repeat(60);
  console.log(`\n${bar}\n  ${title}\n${bar}`);
}

async function presentPassport(
  passportYaml: string,
  targetPath: string,
  description: string,
) {
  console.log(`\n[demo] --- ${description} ---`);
  const b64 = Buffer.from(passportYaml, "utf-8").toString("base64");
  const res = await fetch(`${VALIDATOR_URL}${targetPath}`, {
    headers: { "x-adl-passport": b64 },
  });
  console.log(`[demo] Validator response: ${res.status} ${res.statusText}`);
  if (res.status >= 400) {
    const body = (await res.json()) as {
      error: string;
      outcome?: { summary: string };
    };
    console.log(`[demo]   error: ${body.error}`);
    if (body.outcome) console.log(`[demo]   ${body.outcome.summary}`);
  } else {
    console.log(`[demo]   proxied successfully`);
  }
}

async function main() {
  banner("OpenClaw Passport Demo");
  console.log(
    "Demonstrates the verification procedure proposed in",
  );
  console.log(
    "  proposals/2026-05-03-passport-verification-procedure.md (§10.3)",
  );
  console.log(
    "across three scenarios: consumer setup, enterprise discovery,",
  );
  console.log(
    "and platform passport validation.",
  );

  freePort(ENTERPRISE_PORT);
  freePort(VALIDATOR_PORT);

  // -----------------------------------------------------------------------
  // Phase 1: Consumer setup
  // -----------------------------------------------------------------------
  banner("Phase 1: Consumer Passport Setup");
  const setup = spawn(
    "bun",
    ["run", path.join(dir, "consumer", "setup-passport.ts")],
    { stdio: "inherit" },
  );
  await new Promise<void>((resolve, reject) => {
    setup.on("close", (code) =>
      code === 0 ? resolve() : reject(new Error(`setup exited ${code}`)),
    );
  });

  // -----------------------------------------------------------------------
  // Phase 2: Start enterprise gateway
  // -----------------------------------------------------------------------
  banner("Phase 2: Enterprise Gateway Startup");
  const enterprise = spawn(
    "bun",
    ["run", path.join(dir, "enterprise", "enterprise-gateway.ts")],
    {
      env: { ...process.env, ENTERPRISE_PORT },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  enterprise.stdout.on("data", (b: Buffer) => process.stdout.write(b));
  enterprise.stderr.on("data", (b: Buffer) => process.stderr.write(b));

  const cleanup = () => {
    try {
      enterprise.kill();
    } catch {
      // ignored
    }
    try {
      validator.kill();
    } catch {
      // ignored
    }
  };
  process.on("exit", cleanup);
  process.on("SIGINT", () => {
    cleanup();
    process.exit(130);
  });
  process.on("SIGTERM", () => {
    cleanup();
    process.exit(143);
  });

  await waitForServer(`${ENTERPRISE_URL}/.well-known/adl-agents`);

  // -----------------------------------------------------------------------
  // Phase 3: Discovery probe
  // -----------------------------------------------------------------------
  banner("Phase 3: Discovery Probe");
  const discRes = await fetch(`${ENTERPRISE_URL}/.well-known/adl-agents`);
  const discDoc = (await discRes.json()) as {
    adl_discovery: string;
    agents: Array<{
      id: string;
      adl_document: string;
      name?: string;
      version?: string;
      status?: string;
    }>;
  };
  console.log(
    `[demo] Discovered ${discDoc.agents.length} agent(s) via /.well-known/adl-agents:`,
  );
  for (const a of discDoc.agents) {
    const tag = a.status === "deprecated" ? " [DEPRECATED]" : "";
    console.log(`[demo]   - ${a.name} v${a.version}${tag}`);
    console.log(`[demo]     id:           ${a.id}`);
    console.log(`[demo]     adl_document: ${a.adl_document}`);
  }

  // -----------------------------------------------------------------------
  // Phase 4: Start platform validator
  // -----------------------------------------------------------------------
  banner("Phase 4: Platform Validator Startup");
  const validator = spawn(
    "bun",
    ["run", path.join(dir, "platform", "passport-validator.ts")],
    {
      env: {
        ...process.env,
        VALIDATOR_PORT,
        ENTERPRISE_URL,
        VALIDATOR_MODE: "enforce",
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  validator.stdout.on("data", (b: Buffer) => process.stdout.write(b));
  validator.stderr.on("data", (b: Buffer) => process.stderr.write(b));
  await waitForServer(`${VALIDATOR_URL}/validation/status`);

  // -----------------------------------------------------------------------
  // Phase 5: Verification scenarios
  // -----------------------------------------------------------------------
  banner("Phase 5: Verification Scenarios");

  const consumerPassportPath = path.join(
    dir,
    "consumer",
    "consumer-agent.adl.yaml",
  );
  const consumerYaml = fs.readFileSync(consumerPassportPath, "utf-8");
  const privateKeyPem = fs.readFileSync(
    path.join(dir, "consumer", "consumer.private.pem"),
    "utf-8",
  );

  // Scenario A: valid passport
  await presentPassport(
    consumerYaml,
    "/agents/research-assistant",
    "A. Valid consumer passport requesting research-assistant",
  );

  // Scenario B: tampered passport (modify a field AFTER signing — sig breaks)
  // This demonstrates §10.3.1.5 catching post-sign tampering.
  const { document: tampered } = parseADL(consumerYaml, "yaml");
  if (tampered) {
    tampered.permissions = tampered.permissions ?? {};
    tampered.permissions.network = tampered.permissions.network ?? {};
    tampered.permissions.network.allowed_hosts = [
      ...(tampered.permissions.network.allowed_hosts ?? []),
      "evil.example",
    ];
    await presentPassport(
      yamlStringify(tampered),
      "/agents/research-assistant",
      "B. Tampered passport (added evil.example to allowed_hosts after signing)",
    );
  }

  // Scenario C: validly signed but with a near-expiry attestation, then
  // demonstrate §10.3.1.6 by re-signing a passport whose expires_at is
  // backdated. The schema validator catches expires_at in the past
  // (ADL-4003) which is correct behavior — so we show the procedure
  // surfacing the temporal failure regardless of which step catches it.
  const { document: expiredBase } = parseADL(consumerYaml, "yaml");
  if (expiredBase?.security?.attestation) {
    expiredBase.security.attestation.expires_at = "2024-01-01T00:00:00Z";
    // Re-sign so the only failure is temporal (not signature).
    delete expiredBase.security.attestation.signature;
    const expiredSigned = signPassport(expiredBase, privateKeyPem);
    await presentPassport(
      yamlStringify(expiredSigned),
      "/agents/research-assistant",
      "C. Expired attestation (re-signed with expires_at=2024-01-01 — caught at §10.3.1.2 schema or §10.3.1.6 temporal)",
    );
  }

  // Scenario D: retired lifecycle, properly re-signed so signature passes.
  // This demonstrates §10.3.1.7 lifecycle gating in isolation.
  const { document: retiredBase } = parseADL(consumerYaml, "yaml");
  if (retiredBase?.lifecycle && retiredBase.security?.attestation) {
    retiredBase.lifecycle.status = "retired";
    delete retiredBase.security.attestation.signature;
    const retiredSigned = signPassport(retiredBase, privateKeyPem);
    await presentPassport(
      yamlStringify(retiredSigned),
      "/agents/research-assistant",
      "D. Retired requesting agent (re-signed with status=retired — caught at §10.3.1.7 lifecycle)",
    );
  }

  // -----------------------------------------------------------------------
  // Phase 6: Stats
  // -----------------------------------------------------------------------
  banner("Phase 6: Validator Statistics");
  const statsRes = await fetch(`${VALIDATOR_URL}/validation/status`);
  const statsDoc = await statsRes.json();
  console.log(JSON.stringify(statsDoc, null, 2));

  banner("Demo Complete");
  console.log("Spec anchors exercised:");
  console.log("  §6.4    discovery endpoint");
  console.log("  §10.3   signature algorithm + JCS");
  console.log("  §10.3.1.1 retrieval integrity");
  console.log("  §10.3.1.2 schema validation");
  console.log("  §10.3.1.3 identity resolution (did:web)");
  console.log("  §10.3.1.4 public key cross-check");
  console.log("  §10.3.1.5 signature verification");
  console.log("  §10.3.1.6 temporal validity");
  console.log("  §10.3.1.7 lifecycle gating");
  console.log("  §10.3.1.8 provider–identity coherence");

  cleanup();
  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
