/**
 * Tests for ADLDocument -> AgentIR transformation.
 */

import { describe, expect, it } from "bun:test";
import { loadADLSync } from "@adl-spec/core";
import { transformToIR } from "../src/ir/transform.js";
import type { AgentIR } from "../src/ir/types.js";
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

describe("transformToIR", () => {
  describe("minimal fixture", () => {
    let ir: AgentIR;

    it("transforms without error", () => {
      const doc = loadFixture("minimal.json");
      ir = transformToIR(doc);
      expect(ir).toBeDefined();
    });

    it("maps identity correctly", () => {
      const doc = loadFixture("minimal.json");
      ir = transformToIR(doc);
      expect(ir.identity.name).toBe("Hello Agent");
      expect(ir.identity.description).toBe("A simple greeting agent.");
      expect(ir.identity.version).toBe("1.0.0");
    });

    it("has null model when none specified", () => {
      const doc = loadFixture("minimal.json");
      ir = transformToIR(doc);
      expect(ir.model).toBeNull();
    });

    it("has null system prompt when none specified", () => {
      const doc = loadFixture("minimal.json");
      ir = transformToIR(doc);
      expect(ir.systemPrompt).toBeNull();
    });

    it("has empty tools and resources", () => {
      const doc = loadFixture("minimal.json");
      ir = transformToIR(doc);
      expect(ir.tools).toEqual([]);
      expect(ir.resources).toEqual([]);
    });

    it("maps data classification", () => {
      const doc = loadFixture("minimal.json");
      ir = transformToIR(doc);
      expect(ir.dataClassification.sensitivity).toBe("public");
      expect(ir.dataClassification.categories).toEqual([]);
    });

    it("defaults permissions to empty", () => {
      const doc = loadFixture("minimal.json");
      ir = transformToIR(doc);
      expect(ir.permissions.network.allowedHosts).toEqual([]);
      expect(ir.permissions.filesystem.allowedPaths).toEqual([]);
      expect(ir.permissions.execution.allowShell).toBe(false);
      expect(ir.permissions.resourceLimits.maxMemoryMb).toBeNull();
    });

    it("defaults security to no auth", () => {
      const doc = loadFixture("minimal.json");
      ir = transformToIR(doc);
      expect(ir.security.authentication).toBeNull();
      expect(ir.security.encryptionInTransit).toBe(false);
    });

    it("defaults runtime to abort/0 retries", () => {
      const doc = loadFixture("minimal.json");
      ir = transformToIR(doc);
      expect(ir.runtime.errorHandling.onToolError).toBe("abort");
      expect(ir.runtime.errorHandling.maxRetries).toBe(0);
    });

    it("has null lifecycle when not specified", () => {
      const doc = loadFixture("minimal.json");
      ir = transformToIR(doc);
      expect(ir.lifecycle).toBeNull();
    });
  });

  describe("production fixture", () => {
    let ir: AgentIR;

    it("transforms without error", () => {
      const doc = loadFixture("production.json");
      ir = transformToIR(doc);
      expect(ir).toBeDefined();
    });

    it("maps identity with id", () => {
      const doc = loadFixture("production.json");
      ir = transformToIR(doc);
      expect(ir.identity.name).toBe("Research Assistant");
      expect(ir.identity.id).toBe(
        "urn:adl:acme:research-assistant:2.1.0",
      );
    });

    it("maps model config", () => {
      const doc = loadFixture("production.json");
      ir = transformToIR(doc);
      expect(ir.model).not.toBeNull();
      expect(ir.model!.provider).toBe("anthropic");
      expect(ir.model!.name).toBe("claude-sonnet-4-20250514");
      expect(ir.model!.temperature).toBe(0.5);
      expect(ir.model!.contextWindow).toBe(200000);
      expect(ir.model!.capabilities).toContain("function_calling");
    });

    it("maps tools correctly", () => {
      const doc = loadFixture("production.json");
      ir = transformToIR(doc);
      expect(ir.tools).toHaveLength(3);

      const searchTool = ir.tools.find((t) => t.name === "search_papers");
      expect(searchTool).toBeDefined();
      expect(searchTool!.readOnly).toBe(true);
      expect(searchTool!.parameters).toBeDefined();

      const saveTool = ir.tools.find((t) => t.name === "save_note");
      expect(saveTool).toBeDefined();
      expect(saveTool!.readOnly).toBe(false);
    });

    it("maps resources", () => {
      const doc = loadFixture("production.json");
      ir = transformToIR(doc);
      expect(ir.resources).toHaveLength(1);
      expect(ir.resources[0].name).toBe("paper_index");
      expect(ir.resources[0].type).toBe("vector_store");
      expect(ir.resources[0].uri).toBe("s3://research-data/papers/");
    });

    it("maps permissions", () => {
      const doc = loadFixture("production.json");
      ir = transformToIR(doc);
      expect(ir.permissions.network.allowedHosts).toContain(
        "api.semanticscholar.org",
      );
      expect(ir.permissions.network.allowedHosts).toContain("arxiv.org");
      expect(ir.permissions.network.denyPrivate).toBe(true);
      expect(ir.permissions.filesystem.allowedPaths).toHaveLength(2);
      expect(ir.permissions.resourceLimits.maxMemoryMb).toBe(2048);
      expect(ir.permissions.resourceLimits.maxDurationSec).toBe(300);
    });

    it("maps security", () => {
      const doc = loadFixture("production.json");
      ir = transformToIR(doc);
      expect(ir.security.authentication).not.toBeNull();
      expect(ir.security.authentication!.type).toBe("oauth2");
      expect(ir.security.authentication!.required).toBe(true);
      expect(ir.security.authentication!.scopes).toContain("read:papers");
      expect(ir.security.encryptionInTransit).toBe(true);
    });

    it("maps runtime", () => {
      const doc = loadFixture("production.json");
      ir = transformToIR(doc);
      expect(ir.runtime.errorHandling.onToolError).toBe("retry");
      expect(ir.runtime.errorHandling.maxRetries).toBe(2);
      expect(ir.runtime.toolInvocation.parallel).toBe(true);
      expect(ir.runtime.toolInvocation.maxConcurrent).toBe(3);
      expect(ir.runtime.toolInvocation.timeoutMs).toBe(30000);
    });

    it("maps lifecycle", () => {
      const doc = loadFixture("production.json");
      ir = transformToIR(doc);
      expect(ir.lifecycle).not.toBeNull();
      expect(ir.lifecycle!.status).toBe("active");
      expect(ir.lifecycle!.effectiveDate).toBe("2026-01-15T00:00:00Z");
    });

    it("maps data classification with categories", () => {
      const doc = loadFixture("production.json");
      ir = transformToIR(doc);
      expect(ir.dataClassification.sensitivity).toBe("internal");
      expect(ir.dataClassification.categories).toContain(
        "intellectual_property",
      );
    });
  });

  describe("with-tools fixture", () => {
    it("maps tool metadata (readOnly, idempotent)", () => {
      const doc = loadFixture("with-tools.json");
      const ir = transformToIR(doc);
      expect(ir.tools).toHaveLength(2);

      const addTool = ir.tools.find((t) => t.name === "add");
      expect(addTool).toBeDefined();
      expect(addTool!.readOnly).toBe(true);
      expect(addTool!.idempotent).toBe(true);
      expect(addTool!.returns).toEqual({ type: "number" });
    });
  });
});
