import { describe, test, expect } from "bun:test";
import { parseADL } from "../src/parse/parser";
import { loadADL, loadADLSync } from "../src/parse/loader";
import * as path from "node:path";
import * as fs from "node:fs";

const FIXTURES = path.join(import.meta.dir, "fixtures");

describe("parseADL", () => {
  test("parses valid JSON string", () => {
    const content = fs.readFileSync(
      path.join(FIXTURES, "valid/minimal.json"),
      "utf-8",
    );
    const { document, errors } = parseADL(content);
    expect(errors).toHaveLength(0);
    expect(document).not.toBeNull();
    expect(document!.name).toBe("Hello Agent");
  });

  test("parses valid YAML string", () => {
    const content = fs.readFileSync(
      path.join(FIXTURES, "valid/minimal.yaml"),
      "utf-8",
    );
    const { document, errors } = parseADL(content, "yaml");
    expect(errors).toHaveLength(0);
    expect(document).not.toBeNull();
  });

  test("auto-detects JSON format", () => {
    const content = '{"adl_spec": "0.1.0", "name": "test"}';
    const { document, errors } = parseADL(content);
    expect(errors).toHaveLength(0);
    expect(document).not.toBeNull();
  });

  test("auto-detects YAML format", () => {
    const content = "adl_spec: '0.1.0'\nname: test\n";
    const { document, errors } = parseADL(content);
    expect(errors).toHaveLength(0);
    expect(document).not.toBeNull();
  });

  test("returns ADL-1001 for invalid JSON", () => {
    const { document, errors } = parseADL("{bad json}", "json");
    expect(document).toBeNull();
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe("ADL-1001");
  });

  test("returns ADL-1002 for JSON array", () => {
    const { document, errors } = parseADL("[]", "json");
    expect(document).toBeNull();
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe("ADL-1002");
  });

  test("returns ADL-1002 for YAML scalar", () => {
    const { document, errors } = parseADL("just a string", "yaml");
    expect(document).toBeNull();
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe("ADL-1002");
  });
});

describe("loadADL", () => {
  test("loads JSON file", async () => {
    const { document, errors } = await loadADL(
      path.join(FIXTURES, "valid/minimal.json"),
    );
    expect(errors).toHaveLength(0);
    expect(document).not.toBeNull();
    expect(document!.name).toBe("Hello Agent");
  });

  test("loads YAML file", async () => {
    const { document, errors } = await loadADL(
      path.join(FIXTURES, "valid/minimal.yaml"),
    );
    expect(errors).toHaveLength(0);
    expect(document).not.toBeNull();
  });

  test("returns error for missing file", async () => {
    const { document, errors } = await loadADL("/nonexistent/file.json");
    expect(document).toBeNull();
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe("ADL-1001");
  });
});

describe("loadADLSync", () => {
  test("loads JSON file synchronously", () => {
    const { document, errors } = loadADLSync(
      path.join(FIXTURES, "valid/minimal.json"),
    );
    expect(errors).toHaveLength(0);
    expect(document).not.toBeNull();
    expect(document!.name).toBe("Hello Agent");
  });

  test("returns error for missing file", () => {
    const { document, errors } = loadADLSync("/nonexistent/file.json");
    expect(document).toBeNull();
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe("ADL-1001");
  });
});
