#!/usr/bin/env bun
import { Command } from "commander";
import { registerValidateCommand } from "./commands/validate.js";
import { registerConvertCommand } from "./commands/convert.js";
import { registerInitCommand } from "./commands/init.js";
import { registerGenerateCommand } from "./commands/generate.js";

const program = new Command();

program
  .name("adl")
  .description("CLI tooling for the Agent Definition Language (ADL)")
  .version("0.3.0")
  .showHelpAfterError("(run with --help for usage and examples)")
  .addHelpText(
    "after",
    `
Examples:
  adl init --template governance --output agent.adl.json
  adl validate agent.adl.json
  cat agent.adl.json | adl validate -
  adl convert agent.adl.json --to a2a
  adl generate agent.adl.json --target typescript

Run 'adl <command> --help' for command-specific options and examples.`,
  );

registerValidateCommand(program);
registerConvertCommand(program);
registerInitCommand(program);
registerGenerateCommand(program);

// No subcommand → show help instead of exiting silently.
program.action(() => {
  program.help();
});

program.parse();
