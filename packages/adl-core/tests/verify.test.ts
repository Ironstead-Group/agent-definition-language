import { describe, test, expect } from "bun:test";
import { stringify as yamlStringify } from "yaml";
import {
  buildPassport,
  signPassport,
  generateKeyPair,
  jcsCanonicalize,
  signCanonical,
  verifyCanonical,
  buildDIDDocument,
  didWebToUrl,
  resolveDIDWeb,
  verifyPassport,
  DEFAULT_VERIFY_CONFIG,
  type VerifyConfig,
} from "../src/index";

const baseInput = {
  name: "Test Agent",
  description: "A test agent for verification",
  version: "1.0.0",
  id: "https://test.example/agents/test",
  did: "did:web:test.example:agents:test",
  sensitivity: "internal" as const,
  provider: {
    name: "Test Org",
    url: "https://test.example",
    contact: "test@test.example",
  },
  allowedHosts: ["api.test.example"],
};

function configWith(overrides: Partial<VerifyConfig> = {}): VerifyConfig {
  return { ...DEFAULT_VERIFY_CONFIG, ...overrides };
}

describe("crypto", () => {
  test("generateKeyPair produces a 32-byte Base64 public key", () => {
    const { publicKey, privateKeyPem } = generateKeyPair();
    expect(Buffer.from(publicKey, "base64").length).toBe(32);
    expect(privateKeyPem).toContain("BEGIN PRIVATE KEY");
  });

  test("sign + verify roundtrip succeeds", () => {
    const { publicKey, privateKeyPem } = generateKeyPair();
    const data = Buffer.from("payload to sign");
    const sig = signCanonical(privateKeyPem, data);
    expect(verifyCanonical(publicKey, data, sig)).toBe(true);
  });

  test("verify fails on tampered data", () => {
    const { publicKey, privateKeyPem } = generateKeyPair();
    const sig = signCanonical(privateKeyPem, Buffer.from("original"));
    expect(verifyCanonical(publicKey, Buffer.from("tampered"), sig)).toBe(false);
  });

  test("verify fails on wrong key", () => {
    const a = generateKeyPair();
    const b = generateKeyPair();
    const sig = signCanonical(a.privateKeyPem, Buffer.from("data"));
    expect(verifyCanonical(b.publicKey, Buffer.from("data"), sig)).toBe(false);
  });
});

describe("jcsCanonicalize", () => {
  test("sorts object keys", () => {
    expect(jcsCanonicalize({ b: 1, a: 2 })).toBe('{"a":2,"b":1}');
  });

  test("preserves array order", () => {
    expect(jcsCanonicalize([3, 1, 2])).toBe("[3,1,2]");
  });

  test("handles nested objects deterministically", () => {
    const x = { z: { b: 1, a: 2 }, a: [3, 1, 2] };
    const y = { a: [3, 1, 2], z: { a: 2, b: 1 } };
    expect(jcsCanonicalize(x)).toBe(jcsCanonicalize(y));
  });

  test("rejects NaN", () => {
    expect(() => jcsCanonicalize(NaN)).toThrow();
  });
});

describe("buildPassport + signPassport", () => {
  test("builds a passport that schema-validates", () => {
    const { publicKey } = generateKeyPair();
    const doc = buildPassport({ ...baseInput, publicKey });
    expect(doc.adl_spec).toBe("0.3.0");
    expect(doc.id).toBe(baseInput.id);
    expect(doc.cryptographic_identity?.public_key?.value).toBe(publicKey);
  });

  test("signPassport adds signature", () => {
    const { publicKey, privateKeyPem } = generateKeyPair();
    const unsigned = buildPassport({ ...baseInput, publicKey });
    const signed = signPassport(unsigned, privateKeyPem);
    expect(signed.security?.attestation?.signature).toBeDefined();
    expect(signed.security?.attestation?.signature?.algorithm).toBe("Ed25519");
    expect(signed.security?.attestation?.signature?.signed_content).toBe(
      "canonical",
    );
  });

  test("signing is deterministic for same input + key", () => {
    const { publicKey, privateKeyPem } = generateKeyPair();
    const unsigned = buildPassport({
      ...baseInput,
      publicKey,
      issuedAt: "2026-05-01T00:00:00.000Z",
      expiresAt: "2027-05-01T00:00:00.000Z",
    });
    const a = signPassport(unsigned, privateKeyPem);
    const b = signPassport(unsigned, privateKeyPem);
    expect(a.security?.attestation?.signature?.value).toBe(
      b.security?.attestation?.signature?.value,
    );
  });

  test("does not mutate the input document", () => {
    const { publicKey, privateKeyPem } = generateKeyPair();
    const unsigned = buildPassport({ ...baseInput, publicKey });
    signPassport(unsigned, privateKeyPem);
    expect(unsigned.security?.attestation?.signature).toBeUndefined();
  });
});

describe("did:web", () => {
  test("didWebToUrl handles top-level identifiers", () => {
    expect(didWebToUrl("did:web:example.com")).toBe(
      "https://example.com/.well-known/did.json",
    );
  });

  test("didWebToUrl handles path-based identifiers", () => {
    expect(didWebToUrl("did:web:example.com:agents:foo")).toBe(
      "https://example.com/agents/foo/did.json",
    );
  });

  test("didWebToUrl applies localOverrides", () => {
    expect(
      didWebToUrl("did:web:home.local:agents:foo", {
        "home.local": "http://localhost:3001",
      }),
    ).toBe("http://localhost:3001/agents/foo/did.json");
  });

  test("buildDIDDocument has assertionMethod", () => {
    const doc = buildDIDDocument("did:web:test.example", "AAAA");
    expect(doc.id).toBe("did:web:test.example");
    expect(doc.assertionMethod?.length).toBe(1);
    expect(doc.verificationMethod?.[0].publicKeyBase64).toBe("AAAA");
  });

  test("resolveDIDWeb uses injected fetch", async () => {
    const { publicKey } = generateKeyPair();
    const did = "did:web:test.example:agents:bot";
    const fakeFetch = (async () =>
      new Response(JSON.stringify(buildDIDDocument(did, publicKey)), {
        status: 200,
      })) as typeof fetch;
    const result = await resolveDIDWeb(did, { fetchImpl: fakeFetch });
    expect(result.resolved).toBe(true);
    expect(result.key?.value).toBe(publicKey);
    expect(result.key?.algorithm).toBe("Ed25519");
  });

  test("resolveDIDWeb reports failures", async () => {
    const fakeFetch = (async () =>
      new Response("not found", { status: 404 })) as typeof fetch;
    const result = await resolveDIDWeb("did:web:missing.example", {
      fetchImpl: fakeFetch,
    });
    expect(result.resolved).toBe(false);
    expect(result.error).toContain("404");
  });
});

describe("verifyPassport (§10.3 procedure)", () => {
  function makeSignedPassport() {
    const { publicKey, privateKeyPem } = generateKeyPair();
    const unsigned = buildPassport({ ...baseInput, publicKey });
    const signed = signPassport(unsigned, privateKeyPem);
    return { publicKey, privateKeyPem, signed };
  }

  test("verifies a freshly signed passport", async () => {
    const { signed } = makeSignedPassport();
    const bytes = new TextEncoder().encode(yamlStringify(signed));
    const outcome = await verifyPassport(
      {
        passportBytes: bytes,
        retrievalChannel: "header",
        retrievalAuthority: "localhost:3000",
      },
      configWith(),
    );
    expect(outcome.verified).toBe(true);
    expect(outcome.summary).toContain("verified");
  });

  test("blocks at §1.1.5 when payload tampered after signing", async () => {
    const { signed } = makeSignedPassport();
    // Tamper: add a host to allowed_hosts AFTER signing
    signed.permissions!.network!.allowed_hosts = [
      ...(signed.permissions!.network!.allowed_hosts ?? []),
      "evil.example",
    ];
    const bytes = new TextEncoder().encode(yamlStringify(signed));
    const outcome = await verifyPassport(
      {
        passportBytes: bytes,
        retrievalChannel: "header",
        retrievalAuthority: "localhost:3000",
      },
      configWith(),
    );
    expect(outcome.verified).toBe(false);
    expect(outcome.summary).toContain("§1.1.5");
  });

  test("blocks at §1.1.7 when lifecycle is retired", async () => {
    const { publicKey, privateKeyPem } = generateKeyPair();
    const unsigned = buildPassport({ ...baseInput, publicKey });
    unsigned.lifecycle = { ...unsigned.lifecycle!, status: "retired" };
    const signed = signPassport(unsigned, privateKeyPem);
    const bytes = new TextEncoder().encode(yamlStringify(signed));
    const outcome = await verifyPassport(
      {
        passportBytes: bytes,
        retrievalChannel: "header",
        retrievalAuthority: "localhost:3000",
      },
      configWith(),
    );
    expect(outcome.verified).toBe(false);
    expect(outcome.summary).toContain("§1.1.7");
  });

  test("blocks when classification of requesting agent is too low (§1.1.9)", async () => {
    // Build a target that's confidential and re-sign it (mutating after
    // signing would break §1.1.5 first).
    const { publicKey, privateKeyPem } = generateKeyPair();
    const unsignedTarget = buildPassport({
      ...baseInput,
      publicKey,
      sensitivity: "confidential",
    });
    const target = signPassport(unsignedTarget, privateKeyPem);

    // requesting agent with public sensitivity
    const { publicKey: p2 } = generateKeyPair();
    const requesting = buildPassport({
      ...baseInput,
      publicKey: p2,
      sensitivity: "public",
      id: "https://other.example/agents/requester",
      did: "did:web:other.example:agents:requester",
    });

    const bytes = new TextEncoder().encode(yamlStringify(target));
    const outcome = await verifyPassport(
      {
        passportBytes: bytes,
        retrievalChannel: "header",
        retrievalAuthority: "localhost:3000",
        requestingAgent: requesting,
      },
      configWith(),
    );
    expect(outcome.verified).toBe(false);
    expect(outcome.summary).toContain("§1.1.9");
  });

  test("blocks at §1.1.4 when inline key disagrees with DID-resolved key", async () => {
    const { publicKey, privateKeyPem } = generateKeyPair();
    const unsigned = buildPassport({ ...baseInput, publicKey });
    const signed = signPassport(unsigned, privateKeyPem);
    const bytes = new TextEncoder().encode(yamlStringify(signed));

    // DID resolution returns a DIFFERENT key
    const { publicKey: otherKey } = generateKeyPair();
    const fakeFetch = (async () =>
      new Response(
        JSON.stringify(buildDIDDocument(baseInput.did, otherKey)),
        { status: 200 },
      )) as typeof fetch;
    // Reach into resolveDIDWeb via the verify config indirectly: we monkey-patch
    // global fetch for this test since verify.ts uses the default fetch.
    const originalFetch = globalThis.fetch;
    globalThis.fetch = fakeFetch;
    try {
      const outcome = await verifyPassport(
        {
          passportBytes: bytes,
          retrievalChannel: "header",
          retrievalAuthority: "localhost:3000",
        },
        configWith({
          requireDidResolution: true,
          trustOnFirstUse: false,
          didLocalOverrides: { "test.example": "https://test.example" },
        }),
      );
      expect(outcome.verified).toBe(false);
      expect(outcome.summary).toContain("§1.1.4");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("provider allowlist blocks unknown providers (§1.1.8)", async () => {
    const { signed } = makeSignedPassport();
    const bytes = new TextEncoder().encode(yamlStringify(signed));
    const outcome = await verifyPassport(
      {
        passportBytes: bytes,
        retrievalChannel: "header",
        retrievalAuthority: "localhost:3000",
      },
      configWith({
        requireProviderCoherence: true,
        providerAllowlist: ["allowed.example"],
      }),
    );
    expect(outcome.verified).toBe(false);
    expect(outcome.summary).toContain("§1.1.8");
  });
});
