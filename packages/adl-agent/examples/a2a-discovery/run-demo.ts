#!/usr/bin/env bun
/**
 * Run the full A2A discovery demo:
 *   1. Free the port if a previous run left a process behind
 *   2. Start the service agent (HTTP server)
 *   3. Wait for it to be ready
 *   4. Run the discovery agent
 *   5. Shut down the service agent
 */

import { spawn, execSync } from "node:child_process";
import * as path from "node:path";

const SERVICE_PORT = "3001";
const dir = import.meta.dir;

function freePort(port: string) {
  try {
    // Find any process listening on the port and kill it
    const pid = execSync(`lsof -ti tcp:${port} 2>/dev/null`, {
      encoding: "utf-8",
    }).trim();
    if (pid) {
      execSync(`kill ${pid} 2>/dev/null`);
      // Give it a moment to release the port
      execSync("sleep 0.3");
    }
  } catch {
    // Nothing listening — that's fine
  }
}

async function waitForServer(url: string, maxAttempts = 30): Promise<void> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      // not ready yet
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`Server at ${url} did not start in time`);
}

async function main() {
  // Ensure the port is free
  freePort(SERVICE_PORT);

  // Start service agent
  console.log("Starting service agent...\n");
  const service = spawn("bun", ["run", path.join(dir, "service-agent.ts")], {
    env: { ...process.env, SERVICE_PORT },
    stdio: ["ignore", "pipe", "pipe"],
  });

  // Ensure cleanup on any exit
  const cleanup = () => {
    try {
      service.kill();
    } catch {}
  };
  process.on("exit", cleanup);
  process.on("SIGINT", () => {
    cleanup();
    process.exit(130);
  });
  process.on("SIGTERM", () => {
    cleanup();
    process.exit(143);
  });

  // Pipe service output
  service.stdout.on("data", (data: Buffer) => {
    process.stdout.write(data.toString());
  });
  service.stderr.on("data", (data: Buffer) => {
    process.stderr.write(data.toString());
  });

  // Wait for server to be ready
  await waitForServer(
    `http://localhost:${SERVICE_PORT}/.well-known/adl-agents`,
  );
  console.log("");

  // Run discovery agent
  const discovery = spawn(
    "bun",
    ["run", path.join(dir, "discovery-agent.ts")],
    {
      env: { ...process.env, SERVICE_URL: `http://localhost:${SERVICE_PORT}` },
      stdio: "inherit",
    },
  );

  // Wait for discovery agent to finish
  const exitCode = await new Promise<number>((resolve) => {
    discovery.on("close", (code) => resolve(code ?? 0));
  });

  // Shut down service
  cleanup();

  process.exit(exitCode);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
