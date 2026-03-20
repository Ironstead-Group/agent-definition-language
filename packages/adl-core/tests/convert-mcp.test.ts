import { describe, test, expect } from "bun:test";
import { loadADLSync } from "../src/parse/loader";
import { convertToMCP } from "../src/convert/mcp";
import * as path from "node:path";

const FIXTURES = path.join(import.meta.dir, "fixtures");

describe("convert to MCP", () => {
  test("converts production document to MCP config", () => {
    const { document } = loadADLSync(
      path.join(FIXTURES, "valid/production.json"),
    );
    const config = convertToMCP(document!);

    expect(config.name).toBe("Research Assistant");
    expect(config.description).toContain("researchers");
    expect(config.version).toBe("2.1.0");
  });

  test("maps tools with inputSchema", () => {
    const { document } = loadADLSync(
      path.join(FIXTURES, "valid/production.json"),
    );
    const config = convertToMCP(document!);

    expect(config.tools).toHaveLength(3);
    expect(config.tools![0].name).toBe("search_papers");
    expect(config.tools![0].inputSchema).toBeDefined();
    expect(config.tools![0].description).toBe("Search for academic papers");
  });

  test("maps resources with URI", () => {
    const { document } = loadADLSync(
      path.join(FIXTURES, "valid/production.json"),
    );
    const config = convertToMCP(document!);

    expect(config.resources).toHaveLength(1);
    expect(config.resources![0].name).toBe("paper_index");
    expect(config.resources![0].uri).toBe("s3://research-data/papers/");
    expect(config.resources![0].description).toContain("paper embeddings");
  });

  test("maps prompts", () => {
    const { document } = loadADLSync(
      path.join(FIXTURES, "valid/production.json"),
    );
    const config = convertToMCP(document!);

    expect(config.prompts).toHaveLength(1);
    expect(config.prompts![0].name).toBe("summarize");
    expect(config.prompts![0].description).toBe("Summarize a paper");
  });

  test("minimal document produces minimal config", () => {
    const { document } = loadADLSync(
      path.join(FIXTURES, "valid/minimal.json"),
    );
    const config = convertToMCP(document!);

    expect(config.name).toBe("Hello Agent");
    expect(config.version).toBe("1.0.0");
    expect(config.tools).toBeUndefined();
    expect(config.resources).toBeUndefined();
    expect(config.prompts).toBeUndefined();
  });

  test("tools-only document maps tools without resources/prompts", () => {
    const { document } = loadADLSync(
      path.join(FIXTURES, "valid/with-tools.json"),
    );
    const config = convertToMCP(document!);

    expect(config.tools).toHaveLength(2);
    expect(config.tools![0].name).toBe("add");
    expect(config.tools![1].name).toBe("multiply");
    expect(config.resources).toBeUndefined();
    expect(config.prompts).toBeUndefined();
  });
});
