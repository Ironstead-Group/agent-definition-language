/**
 * Platform Passport Validation Plugin
 *
 * Implements the OpenClaw gateway plugin pattern from the runtime layer
 * proposal (proposals/2026-03-21-openclaw-runtime-layer.md). On every
 * inbound request, extracts the requesting agent's passport and runs the
 * verification procedure (§10.3) before proxying to the enterprise gateway.
 *
 * Endpoints:
 *   GET  /validation/status       — Health + statistics
 *   ANY  /agents/:slug            — Proxy to enterprise gateway with verification
 *
 * Passport transport:
 *   X-ADL-Passport: Base64-encoded YAML or JSON of the requesting agent's passport
 *
 * Modes (per the OpenClaw runtime layer proposal):
 *   enforce    — Block on any failed block-severity step (HTTP 403)
 *   audit      — Pass through; log failures
 *   permissive — Pass through; attach result as response headers
 */

import {
  verifyPassport,
  type EnforcementMode,
  type VerifyConfig,
} from "@adl-spec/core";

const PORT = parseInt(process.env.VALIDATOR_PORT ?? "3003", 10);
const ENTERPRISE_URL =
  process.env.ENTERPRISE_URL ?? "http://localhost:3002";
const MODE: EnforcementMode =
  (process.env.VALIDATOR_MODE as EnforcementMode) ?? "enforce";

const config: VerifyConfig = {
  mode: MODE,
  requireSignature: true,
  // For consumer-on-Mac-Mini scenarios we accept TOFU since the consumer's
  // home.local does not host a real DID Document. Enterprise-to-enterprise
  // would set this to true.
  requireDidResolution: false,
  requireProviderCoherence: false,
  trustOnFirstUse: true,
  didLocalOverrides: {
    "home.local": "http://localhost:3001",
    "agents.acme.example": ENTERPRISE_URL,
  },
  providerAllowlist: [],
};

interface Stats {
  total: number;
  verified: number;
  blocked: number;
  warned: number;
}

const stats: Stats = { total: 0, verified: 0, blocked: 0, warned: 0 };

function decodePassportHeader(header: string): Uint8Array | undefined {
  try {
    return Buffer.from(header, "base64");
  } catch {
    return undefined;
  }
}

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);

    // ----- Health endpoint -----
    if (req.method === "GET" && url.pathname === "/validation/status") {
      return Response.json({
        mode: config.mode,
        enterprise: ENTERPRISE_URL,
        stats,
      });
    }

    // ----- Proxy with verification -----
    const passportHeader = req.headers.get("x-adl-passport");
    const requestId = req.headers.get("x-request-id") ?? `req-${stats.total + 1}`;
    stats.total++;

    if (!passportHeader) {
      stats.blocked++;
      return Response.json(
        {
          error: "missing_passport",
          detail:
            "X-ADL-Passport header required. Send the requesting agent's passport (Base64-encoded YAML or JSON).",
        },
        { status: 401 },
      );
    }

    const passportBytes = decodePassportHeader(passportHeader);
    if (!passportBytes) {
      stats.blocked++;
      return Response.json(
        { error: "invalid_passport_encoding", detail: "X-ADL-Passport must be valid Base64" },
        { status: 400 },
      );
    }

    const outcome = await verifyPassport(
      {
        passportBytes,
        retrievalChannel: "header",
        retrievalAuthority: req.headers.get("host") ?? undefined,
      },
      config,
    );

    const block = !outcome.verified;
    if (block) stats.blocked++;
    else stats.verified++;
    if (outcome.steps.some((s) => s.severity === "warn" && !s.passed)) {
      stats.warned++;
    }

    // Console log for observability
    console.log(
      `[validator] ${requestId} ${req.method} ${url.pathname} → ${outcome.summary}`,
    );
    for (const step of outcome.steps) {
      const icon = step.passed ? "✓" : "✗";
      console.log(
        `[validator]   ${icon} §${step.section} ${step.name}: ${step.detail}`,
      );
    }

    if (block && config.mode === "enforce") {
      return Response.json(
        {
          error: "passport_verification_failed",
          outcome,
        },
        { status: 403 },
      );
    }

    // Proxy to enterprise gateway
    const upstreamUrl = `${ENTERPRISE_URL}${url.pathname}${url.search}`;
    const upstreamHeaders = new Headers(req.headers);
    upstreamHeaders.delete("x-adl-passport"); // do not forward to upstream
    upstreamHeaders.delete("host");

    const upstreamReq = new Request(upstreamUrl, {
      method: req.method,
      headers: upstreamHeaders,
      body: req.method === "GET" || req.method === "HEAD" ? undefined : req.body,
    });

    const upstream = await fetch(upstreamReq);
    const responseHeaders = new Headers(upstream.headers);

    if (config.mode === "permissive") {
      responseHeaders.set("X-ADL-Validation", outcome.verified ? "passed" : "failed");
      responseHeaders.set("X-ADL-Validation-Summary", outcome.summary);
    }
    if (config.mode === "audit" && block) {
      console.warn(
        `[validator] [audit] passing through despite verification failure: ${outcome.summary}`,
      );
    }

    return new Response(upstream.body, {
      status: upstream.status,
      headers: responseHeaders,
    });
  },
});

console.log(`[validator] Listening on http://localhost:${PORT}`);
console.log(`[validator]   Mode: ${MODE}`);
console.log(`[validator]   Proxying to: ${ENTERPRISE_URL}`);
console.log(`[validator]   Status:  http://localhost:${PORT}/validation/status`);

void server;
