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
  .version("0.2.0");

registerValidateCommand(program);
registerConvertCommand(program);
registerInitCommand(program);
registerGenerateCommand(program);

program.parse();
