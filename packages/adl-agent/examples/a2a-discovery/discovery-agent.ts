/**
 * Discovery Agent — Discovers agents via the well-known ADL discovery
 * endpoint (spec Section 6.4) and communicates using the A2A protocol.
 *
 * Flow:
 *   1. Fetch /.well-known/adl-agents to discover available agents
 *   2. For each agent, fetch its ADL passport from the adl_document URL
 *   3. Parse and validate the passport using @adl-spec/core
 *   4. Convert to an A2A Agent Card to understand capabilities
 *   5. Evaluate trust signals (sensitivity, auth, read-only tools)
 *   6. Send A2A task requests and process the responses
 */

import {
  parseADL,
  validateDocument,
  convertToA2A,
  type ADLDocument,
  type A2AAgentCard,
} from "@adl-spec/core";

const SERVICE_URL = process.env.SERVICE_URL ?? "http://localhost:3001";

// ---------------------------------------------------------------------------
// Discovery document types (spec Section 6.4)
// ---------------------------------------------------------------------------

interface DiscoveryAgent {
  id: string;
  adl_document: string;
  name?: string;
  version?: string;
  description?: string;
  status?: string;
}

interface DiscoveryDocument {
  agents: DiscoveryAgent[];
}

// ---------------------------------------------------------------------------
// A2A Protocol helpers
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

let taskCounter = 0;

async function sendTask(
  baseUrl: string,
  skill: string,
  input: Record<string, unknown>,
): Promise<A2ATaskResponse> {
  const request: A2ATaskRequest = {
    id: `task-${++taskCounter}`,
    skill,
    input,
  };

  const res = await fetch(`${baseUrl}/a2a/tasks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  return (await res.json()) as A2ATaskResponse;
}

// ---------------------------------------------------------------------------
// Phase 1: Discover agents via /.well-known/adl-agents
// ---------------------------------------------------------------------------

async function discoverAgents(baseUrl: string): Promise<DiscoveryAgent[]> {
  const wellKnownUrl = `${baseUrl}/.well-known/adl-agents`;
  console.log(`[discovery] Fetching ${wellKnownUrl} ...`);

  const res = await fetch(wellKnownUrl);
  if (!res.ok) {
    throw new Error(`Discovery endpoint returned ${res.status}`);
  }

  const doc = (await res.json()) as DiscoveryDocument;

  if (!doc.agents || !Array.isArray(doc.agents)) {
    throw new Error("Discovery document missing required 'agents' array");
  }

  console.log(`[discovery] Found ${doc.agents.length} agent(s):`);
  for (const agent of doc.agents) {
    console.log(
      `  - ${agent.name ?? agent.id} (${agent.status ?? "unknown"})`,
    );
    console.log(`    ADL document: ${agent.adl_document}`);
  }

  return doc.agents;
}

// ---------------------------------------------------------------------------
// Phase 2: Fetch and validate an agent's passport
// ---------------------------------------------------------------------------

async function fetchPassport(agentEntry: DiscoveryAgent): Promise<{
  passport: ADLDocument;
  card: A2AAgentCard;
}> {
  console.log(
    `\n[discovery] Fetching passport from ${agentEntry.adl_document} ...`,
  );
  const res = await fetch(agentEntry.adl_document);
  const passportContent = await res.text();

  // Parse — detect format from content. ADL documents may be served as
  // application/adl+json per the spec media type registration, but the
  // actual content can be YAML or JSON. Detect from the content itself.
  const format = passportContent.trimStart().startsWith("{")
    ? ("json" as const)
    : ("yaml" as const);

  const { document, errors: parseErrors } = parseADL(passportContent, format);
  if (parseErrors.length > 0 || !document) {
    throw new Error(
      `Failed to parse passport: ${parseErrors.map((e) => e.detail).join(", ")}`,
    );
  }

  console.log(`[discovery] Passport parsed: ${document.name} v${document.version}`);

  // Validate
  const { valid, errors: valErrors } = validateDocument(document);
  if (!valid) {
    console.warn(
      `[discovery] Passport has validation issues:`,
    );
    for (const e of valErrors) {
      console.warn(`  [${e.code}] ${e.detail}`);
    }
  } else {
    console.log(`[discovery] Passport validated: no errors`);
  }

  // Convert to A2A Agent Card
  const card = convertToA2A(document);

  return { passport: document, card };
}

// ---------------------------------------------------------------------------
// Phase 3: Evaluate trust signals
// ---------------------------------------------------------------------------

function evaluateTrust(passport: ADLDocument, card: A2AAgentCard): boolean {
  console.log(
    `[trust] Data sensitivity: ${passport.data_classification.sensitivity}`,
  );
  console.log(
    `[trust] Auth type: ${passport.security?.authentication?.type ?? "not specified"}`,
  );

  const allReadOnly = passport.tools?.every((t) => t.read_only) ?? false;
  console.log(`[trust] All tools read-only: ${allReadOnly}`);

  if (card.authentication?.schemes?.length) {
    console.log(
      `[trust] A2A auth schemes: ${card.authentication.schemes.join(", ")}`,
    );
  }

  // Simple trust heuristic for the demo
  const trusted =
    passport.data_classification.sensitivity === "public" && allReadOnly;

  console.log(
    `[trust] Evaluation: ${trusted ? "PASSED" : "REVIEW REQUIRED"} ${trusted ? "— safe to communicate" : "— elevated privileges detected"}`,
  );

  return trusted;
}

// ---------------------------------------------------------------------------
// Phase 4: Communicate via A2A
// ---------------------------------------------------------------------------

function printAgentCard(card: A2AAgentCard) {
  console.log(`\n[discovery] Agent Card:`);
  console.log(`  Name:        ${card.name}`);
  console.log(`  Version:     ${card.version}`);
  console.log(`  Description: ${card.description}`);

  if (card.skills && card.skills.length > 0) {
    console.log(`  Skills (${card.skills.length}):`);
    for (const skill of card.skills) {
      const tags = skill.tags?.length ? ` [${skill.tags.join(", ")}]` : "";
      console.log(`    - ${skill.name}: ${skill.description}${tags}`);
    }
  }
}

async function communicateWithAgent(baseUrl: string, card: A2AAgentCard) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`  A2A Communication with: ${card.name}`);
  console.log(`${"=".repeat(60)}`);

  // 1. Explain the passport model
  console.log(`\n--- Task 1: Explain the passport model ---`);
  const explainResult = await sendTask(baseUrl, "explain_concept", {
    concept: "passport model",
  });
  if (explainResult.status === "completed") {
    const output = explainResult.output as {
      found: boolean;
      entry?: { title: string; summary: string };
    };
    console.log(`[response] ${output.entry?.title}`);
    console.log(`[response] ${output.entry?.summary}`);
  } else {
    console.log(`[response] Error: ${explainResult.error}`);
  }

  // 2. Validate a document
  console.log(`\n--- Task 2: Validate a document ---`);
  const validateResult = await sendTask(baseUrl, "validate_document", {
    document: `adl_spec: "0.2.0"\nname: Test Agent\ndescription: A test\nversion: "1.0.0"\ndata_classification:\n  sensitivity: public`,
  });
  if (validateResult.status === "completed") {
    const output = validateResult.output as { valid: boolean; summary: string };
    console.log(`[response] Valid: ${output.valid}`);
    console.log(`[response] ${output.summary}`);
  } else {
    console.log(`[response] Error: ${validateResult.error}`);
  }

  // 3. Show a minimal example
  console.log(`\n--- Task 3: Show a minimal example ---`);
  const exampleResult = await sendTask(baseUrl, "show_example", {
    category: "minimal",
  });
  if (exampleResult.status === "completed") {
    const output = exampleResult.output as {
      found: boolean;
      content?: string;
    };
    if (output.found && output.content) {
      console.log(`[response] Example document:`);
      console.log(
        output.content
          .split("\n")
          .map((l) => `  ${l}`)
          .join("\n"),
      );
    }
  } else {
    console.log(`[response] Error: ${exampleResult.error}`);
  }

  // 4. Compare ADL with A2A
  console.log(`\n--- Task 4: Compare ADL with A2A ---`);
  const compareResult = await sendTask(baseUrl, "compare_formats", {
    format: "a2a",
  });
  if (compareResult.status === "completed") {
    const output = compareResult.output as {
      found: boolean;
      comparison?: { relationship: string };
    };
    if (output.found) {
      console.log(`[response] ${output.comparison?.relationship}`);
    }
  } else {
    console.log(`[response] Error: ${compareResult.error}`);
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("ADL Discovery + A2A Communication Demo");
  console.log("======================================\n");
  console.log(
    "This demo follows the ADL spec discovery flow (Section 6.4):",
  );
  console.log(
    "  /.well-known/adl-agents → fetch passport → validate → A2A\n",
  );

  // Phase 1: Discover
  console.log("Phase 1: DISCOVERY (spec Section 6.4)");
  console.log("--------------------------------------");
  const agents = await discoverAgents(SERVICE_URL);

  if (agents.length === 0) {
    console.log("No agents found.");
    return;
  }

  // Phase 2: Fetch and validate the first agent's passport
  console.log("\nPhase 2: FETCH & VALIDATE PASSPORT");
  console.log("------------------------------------");
  const { passport, card } = await fetchPassport(agents[0]);
  printAgentCard(card);

  // Phase 3: Trust evaluation
  console.log(`\nPhase 3: TRUST EVALUATION`);
  console.log("-------------------------");
  const trusted = evaluateTrust(passport, card);

  if (!trusted) {
    console.log(
      "\n[discovery] Agent requires elevated trust. Skipping communication.",
    );
    return;
  }

  // Phase 4: Communicate via A2A
  console.log(`\nPhase 4: A2A COMMUNICATION`);
  console.log("--------------------------");
  await communicateWithAgent(SERVICE_URL, card);

  console.log(`\n${"=".repeat(60)}`);
  console.log("  Demo complete.");
  console.log("  ");
  console.log("  The discovery agent:");
  console.log(
    "    1. Found agents via /.well-known/adl-agents",
  );
  console.log(
    "    2. Fetched and validated the ADL passport",
  );
  console.log(
    "    3. Converted to A2A Agent Card, evaluated trust",
  );
  console.log(
    "    4. Invoked 4 skills via A2A task requests",
  );
  console.log(`${"=".repeat(60)}\n`);
}

main().catch((err) => {
  console.error("Error:", err.message ?? err);
  console.error(
    "\nMake sure the service agent is running: bun run service-agent.ts",
  );
  process.exit(1);
});
