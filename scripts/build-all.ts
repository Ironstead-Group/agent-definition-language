#!/usr/bin/env bun

/**
 * Build all publishable packages in dependency order.
 *
 * Order matters — downstream packages (generator, cli) need
 * core's declaration files (dist/index.d.ts) to resolve types.
 */

import { $ } from "bun";

const buildOrder = [
  "packages/adl-core",
  "packages/adl-generator",
  "packages/adl-cli",
];

for (const pkg of buildOrder) {
  await $`bun run --cwd ${pkg} build`;
}
