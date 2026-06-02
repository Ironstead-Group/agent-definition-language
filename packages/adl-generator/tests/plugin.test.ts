/**
 * Tests for executable formatter plugins.
 */

import { describe, expect, it } from "bun:test";
import { loadADLSync } from "@adl-spec/core";
import {
  builtinPlugins,
  defineFormatterPlugin,
  executeFormatter,
  listPlugins,
  loadFormatterPlugins,
  registerPlugin,
} from "../src/index.js";
import * as path from "node:path";

const FIXTURES = path.resolve(
  import.meta.dir,
  "../../adl-core/tests/fixtures/valid",
);

function loadFixture(name: string) {
  const result = loadADLSync(path.join(FIXTURES, name));
  if (!result.document) throw new Error(`Failed to load fixture ${name}`);
  return result.document;
}

describe("formatter plugins", () => {
  it("lists built-in formatter plugins", () => {
    const ids = listPlugins().map((plugin) => plugin.id);
    expect(ids).toContain("claude-sdk-ts");
    expect(ids).toContain("langgraph-ts");
    expect(ids).toContain("vanilla-ts");
  });

  it("executes a built-in plugin directly", () => {
    const doc = loadFixture("with-tools.json");
    const result = builtinPlugins.langGraphTs.execute(doc);

    expect(result.plugin).toBe("langgraph-ts");
    expect(result.target).toBe("langgraph-ts");
    expect(result.files.map((file) => file.path)).toContain("agent.ts");
  });

  it("wraps renderer definitions as executable plugins", () => {
    const doc = loadFixture("minimal.json");
    const plugin = defineFormatterPlugin({
      id: "inline-fixture",
      label: "Inline Fixture",
      outputLanguage: "text",
      render(ir) {
        return [
          {
            path: "agent.txt",
            content: `${ir.identity.name}\n`,
          },
        ];
      },
    });

    const result = plugin.execute(doc);
    expect(result.plugin).toBe("inline-fixture");
    expect(result.files[0].content).toBe("Hello Agent\n");
  });

  it("loads and registers formatter plugins from modules", async () => {
    const doc = loadFixture("minimal.json");
    const pluginPath = path.join(
      import.meta.dir,
      "fixtures/formatter-plugin.ts",
    );

    const [plugin] = await loadFormatterPlugins(pluginPath);
    registerPlugin(plugin);

    const result = executeFormatter(doc, "fixture-formatter");
    expect(result.plugin).toBe("fixture-formatter");
    expect(result.files).toEqual([
      {
        path: "agent.txt",
        content: "Generated fixture for Hello Agent\n",
      },
    ]);
  });
});
