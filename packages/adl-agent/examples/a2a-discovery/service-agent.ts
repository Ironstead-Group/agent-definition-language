/**
 * Service Agent — Exposes the ADL Explainer as an A2A-compatible HTTP service.
 *
 * Endpoints per ADL spec Section 6.4 and Section 15.1:
 *   GET  /.well-known/adl-agents  — Discovery document (lists hosted agents)
 *   GET  /agents/adl-explainer    — ADL passport (application/adl+json)
 *   GET  /agents/adl-explainer/a2a — A2A Agent Card (converted from passport)
 *   POST /a2a/tasks               — Handle A2A task requests (invoke skills)
 *
 * The agent's capabilities are defined entirely by its ADL passport.
 * This server reads the passport, converts it to an A2A Agent Card for
 * discovery, and dispatches incoming A2A tasks to the matching tools.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import {
  loadADLSync,
  validateDocument,
  convertToA2A,
  type ADLDocument,
  type A2AAgentCard,
} from "@adl-spec/core";
import { executeTool } from "../../src/shared.js";

const PORT = parseInt(process.env.SERVICE_PORT ?? "3001", 10);
const PASSPORT_PATH = path.resolve(import.meta.dir, "../../agent.adl.yaml");
const AGENT_SLUG = "adl-explainer";

// ---------------------------------------------------------------------------
// Load and validate passport at startup
// ---------------------------------------------------------------------------

const { document: passport, errors: loadErrors } = loadADLSync(PASSPORT_PATH);
if (loadErrors.length > 0 || !passport) {
  console.error("Failed to load passport:", loadErrors);
  process.exit(1);
}

const { valid, errors: valErrors } = validateDocument(passport);
if (!valid) {
  console.error("Passport validation failed:", valErrors);
  process.exit(1);
}

// Convert to A2A Agent Card once at startup
const agentCard: A2AAgentCard = convertToA2A(passport);
const passportYaml = fs.readFileSync(PASSPORT_PATH, "utf-8");

// Build the discovery document per spec Section 6.4:
// "MUST be a JSON object ... MUST contain an `agents` array.
//  Each entry ... MUST be an object with at least `id` and `adl_document`."
function buildDiscoveryDocument(baseUrl: string) {
  return {
    agents: [
      {
        id: passport!.id ?? `${baseUrl}/agents/${AGENT_SLUG}`,
        adl_document: `${baseUrl}/agents/${AGENT_SLUG}`,
        name: passport!.name,
        version: passport!.version,
        description: passport!.description,
        status: passport!.lifecycle?.status ?? "active",
      },
    ],
  };
}

console.log(`[service] Passport loaded: ${passport.name} v${passport.version}`);
console.log(
  `[service] Skills: ${agentCard.skills?.map((s) => s.name).join(", ")}`,
);

// ---------------------------------------------------------------------------
// A2A Task handling
// ---------------------------------------------------------------------------

interface A2ATaskRequest {
  id: string;
  skill: string;
  input: Record<string, unknown>;
}

interface A2ATaskResponse {
  id: string;
  status: "completed" | "failed";
  skill: string;
  output?: unknown;
  error?: string;
}

function handleTask(req: A2ATaskRequest): A2ATaskResponse {
  const skill = agentCard.skills?.find((s) => s.name === req.skill);
  if (!skill) {
    return {
      id: req.id,
      status: "failed",
      skill: req.skill,
      error: `Unknown skill: ${req.skill}. Available: ${agentCard.skills?.map((s) => s.name).join(", ")}`,
    };
  }

  const resultJson = executeTool(req.skill, req.input);
  const result = JSON.parse(resultJson);

  if (result.error) {
    return {
      id: req.id,
      status: "failed",
      skill: req.skill,
      error: result.error,
    };
  }

  return {
    id: req.id,
    status: "completed",
    skill: req.skill,
    output: result,
  };
}

// ---------------------------------------------------------------------------
// HTTP Server
// ---------------------------------------------------------------------------

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    const baseUrl = `${url.protocol}//${url.host}`;

    // Spec Section 6.4: Well-known discovery endpoint
    // "Domains hosting ADL agents MAY publish a discovery document at
    //  https://{domain}/.well-known/adl-agents"
    if (
      req.method === "GET" &&
      url.pathname === "/.well-known/adl-agents"
    ) {
      return Response.json(buildDiscoveryDocument(baseUrl), {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=300",
        },
      });
    }

    // ADL passport served at agent URL (application/adl+json per spec Section 17.1)
    if (
      req.method === "GET" &&
      url.pathname === `/agents/${AGENT_SLUG}`
    ) {
      return new Response(passportYaml, {
        headers: { "Content-Type": "application/adl+json" },
      });
    }

    // A2A Agent Card (converted from passport per spec Section 15.1)
    if (
      req.method === "GET" &&
      url.pathname === `/agents/${AGENT_SLUG}/a2a`
    ) {
      return Response.json(agentCard, {
        headers: { "Content-Type": "application/json" },
      });
    }

    // A2A Task submission
    if (req.method === "POST" && url.pathname === "/a2a/tasks") {
      const body = (await req.json()) as A2ATaskRequest;

      if (!body.id || !body.skill) {
        return Response.json(
          { error: "Missing required fields: id, skill" },
          { status: 400 },
        );
      }

      console.log(
        `[service] Task ${body.id}: ${body.skill}(${JSON.stringify(body.input)})`,
      );
      const response = handleTask(body);
      console.log(`[service] Task ${body.id}: ${response.status}`);

      return Response.json(response);
    }

    return Response.json({ error: "Not found" }, { status: 404 });
  },
});

console.log(`[service] Listening on http://localhost:${PORT}`);
console.log(
  `[service] Discovery:  http://localhost:${PORT}/.well-known/adl-agents`,
);
console.log(
  `[service] Passport:   http://localhost:${PORT}/agents/${AGENT_SLUG}`,
);
console.log(
  `[service] A2A Card:   http://localhost:${PORT}/agents/${AGENT_SLUG}/a2a`,
);
console.log(`[service] Tasks:      POST http://localhost:${PORT}/a2a/tasks`);
