import { describe, test, expect } from "bun:test";
import { loadADLSync } from "../src/parse/loader";
import { convertToA2A } from "../src/convert/a2a";
import type { ADLDocument } from "../src/types/document";
import * as path from "node:path";

const FIXTURES = path.join(import.meta.dir, "fixtures");

describe("convert to A2A", () => {
  test("converts production document to A2A Agent Card", () => {
    const { document } = loadADLSync(
      path.join(FIXTURES, "valid/production.json"),
    );
    const card = convertToA2A(document!);

    expect(card.name).toBe("Research Assistant");
    expect(card.description).toContain("researchers");
    expect(card.version).toBe("2.1.0");
    expect(card.id).toBe("did:web:acme.ai:agents:research-assistant");
  });

  test("maps tools to skills", () => {
    const { document } = loadADLSync(
      path.join(FIXTURES, "valid/production.json"),
    );
    const card = convertToA2A(document!);

    expect(card.skills).toBeDefined();
    expect(card.skills).toHaveLength(3);
    expect(card.skills![0].id).toBe("search_papers");
    expect(card.skills![0].description).toBe("Search for academic papers");
    expect(card.skills![0].inputSchema).toBeDefined();
    expect(card.skills![0].tags).toContain("read-only");
  });

  test("maps authentication", () => {
    const { document } = loadADLSync(
      path.join(FIXTURES, "valid/production.json"),
    );
    const card = convertToA2A(document!);

    expect(card.authentication).toBeDefined();
    expect(card.authentication!.schemes).toContain("oauth2");
    expect(card.authentication!.scopes).toContain("read:papers");
  });

  test("maps provider info", () => {
    const { document } = loadADLSync(
      path.join(FIXTURES, "valid/production.json"),
    );
    const card = convertToA2A(document!);

    expect(card.provider).toBeDefined();
    expect(card.provider!.organization).toBe("Acme AI");
    expect(card.provider!.url).toBe("https://acme.ai");
  });

  test("maps documentation URL", () => {
    const { document } = loadADLSync(
      path.join(FIXTURES, "valid/production.json"),
    );
    const card = convertToA2A(document!);

    expect(card.documentationUrl).toBe(
      "https://docs.acme.ai/research-assistant",
    );
  });

  test("minimal document produces minimal card", () => {
    const { document } = loadADLSync(
      path.join(FIXTURES, "valid/minimal.json"),
    );
    const card = convertToA2A(document!);

    expect(card.name).toBe("Hello Agent");
    expect(card.version).toBe("1.0.0");
    expect(card.skills).toBeUndefined();
    expect(card.authentication).toBeUndefined();
  });
});
