import { describe, test, expect } from "bun:test";
import { loadDocument } from "../src/core/loader";
import { convertToA2A } from "../src/converters/a2a";
import * as path from "node:path";

const FIXTURES = path.join(import.meta.dir, "fixtures");

describe("convert to A2A", () => {
  test("converts production document to A2A Agent Card", () => {
    const { data } = loadDocument(
      path.join(FIXTURES, "valid/production.json"),
    );
    const card = convertToA2A(data as Record<string, unknown>);

    expect(card.name).toBe("Research Assistant");
    expect(card.description).toContain("researchers");
    expect(card.version).toBe("2.1.0");
    expect(card.id).toBe("did:web:acme.ai:agents:research-assistant");
  });

  test("maps tools to skills", () => {
    const { data } = loadDocument(
      path.join(FIXTURES, "valid/production.json"),
    );
    const card = convertToA2A(data as Record<string, unknown>);

    expect(card.skills).toBeDefined();
    const skills = card.skills as Array<Record<string, unknown>>;
    expect(skills).toHaveLength(3);
    expect(skills[0].id).toBe("search_papers");
    expect(skills[0].description).toBe("Search for academic papers");
    expect(skills[0].inputSchema).toBeDefined();
    expect(skills[0].tags).toContain("read-only");
  });

  test("maps authentication", () => {
    const { data } = loadDocument(
      path.join(FIXTURES, "valid/production.json"),
    );
    const card = convertToA2A(data as Record<string, unknown>);

    expect(card.authentication).toBeDefined();
    const auth = card.authentication as Record<string, unknown>;
    expect(auth.schemes).toContain("oauth2");
    expect(auth.scopes).toContain("read:papers");
  });

  test("maps provider info", () => {
    const { data } = loadDocument(
      path.join(FIXTURES, "valid/production.json"),
    );
    const card = convertToA2A(data as Record<string, unknown>);

    const provider = card.provider as Record<string, unknown>;
    expect(provider.organization).toBe("Acme AI");
    expect(provider.url).toBe("https://acme.ai");
  });

  test("maps documentation URL", () => {
    const { data } = loadDocument(
      path.join(FIXTURES, "valid/production.json"),
    );
    const card = convertToA2A(data as Record<string, unknown>);

    expect(card.documentationUrl).toBe(
      "https://docs.acme.ai/research-assistant",
    );
  });

  test("minimal document produces minimal card", () => {
    const { data } = loadDocument(
      path.join(FIXTURES, "valid/minimal.json"),
    );
    const card = convertToA2A(data as Record<string, unknown>);

    expect(card.name).toBe("Hello Agent");
    expect(card.version).toBe("1.0.0");
    expect(card.skills).toBeUndefined();
    expect(card.authentication).toBeUndefined();
  });
});
