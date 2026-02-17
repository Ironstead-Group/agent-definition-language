import { describe, test, expect } from "bun:test";
import { loadDocument } from "../src/core/loader";
import { convertToMCP } from "../src/converters/mcp";
import * as path from "node:path";

const FIXTURES = path.join(import.meta.dir, "fixtures");

describe("convert to MCP", () => {
  test("converts production document to MCP config", () => {
    const { data } = loadDocument(
      path.join(FIXTURES, "valid/production.json"),
    );
    const config = convertToMCP(data as Record<string, unknown>);

    expect(config.name).toBe("Research Assistant");
    expect(config.description).toContain("researchers");
    expect(config.version).toBe("2.1.0");
  });

  test("maps tools with inputSchema", () => {
    const { data } = loadDocument(
      path.join(FIXTURES, "valid/production.json"),
    );
    const config = convertToMCP(data as Record<string, unknown>);

    const tools = config.tools as Array<Record<string, unknown>>;
    expect(tools).toHaveLength(3);
    expect(tools[0].name).toBe("search_papers");
    expect(tools[0].inputSchema).toBeDefined();
    expect(tools[0].description).toBe("Search for academic papers");
  });

  test("maps resources with URI", () => {
    const { data } = loadDocument(
      path.join(FIXTURES, "valid/production.json"),
    );
    const config = convertToMCP(data as Record<string, unknown>);

    const resources = config.resources as Array<Record<string, unknown>>;
    expect(resources).toHaveLength(1);
    expect(resources[0].name).toBe("paper_index");
    expect(resources[0].uri).toBe("s3://research-data/papers/");
    expect(resources[0].description).toContain("paper embeddings");
  });

  test("maps prompts", () => {
    const { data } = loadDocument(
      path.join(FIXTURES, "valid/production.json"),
    );
    const config = convertToMCP(data as Record<string, unknown>);

    const prompts = config.prompts as Array<Record<string, unknown>>;
    expect(prompts).toHaveLength(1);
    expect(prompts[0].name).toBe("summarize");
    expect(prompts[0].description).toBe("Summarize a paper");
  });

  test("minimal document produces minimal config", () => {
    const { data } = loadDocument(
      path.join(FIXTURES, "valid/minimal.json"),
    );
    const config = convertToMCP(data as Record<string, unknown>);

    expect(config.name).toBe("Hello Agent");
    expect(config.version).toBe("1.0.0");
    expect(config.tools).toBeUndefined();
    expect(config.resources).toBeUndefined();
    expect(config.prompts).toBeUndefined();
  });

  test("tools-only document maps tools without resources/prompts", () => {
    const { data } = loadDocument(
      path.join(FIXTURES, "valid/with-tools.json"),
    );
    const config = convertToMCP(data as Record<string, unknown>);

    const tools = config.tools as Array<Record<string, unknown>>;
    expect(tools).toHaveLength(2);
    expect(tools[0].name).toBe("add");
    expect(tools[1].name).toBe("multiply");
    expect(config.resources).toBeUndefined();
    expect(config.prompts).toBeUndefined();
  });
});
