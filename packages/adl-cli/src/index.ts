#!/usr/bin/env bun
import { Command } from "commander";
import { registerValidateCommand } from "./commands/validate.js";
import { registerConvertCommand } from "./commands/convert.js";
import { registerInitCommand } from "./commands/init.js";

const program = new Command();

program
  .name("adl")
  .description("CLI tooling for the Agent Definition Language (ADL)")
  .version("0.1.0");

registerValidateCommand(program);
registerConvertCommand(program);
registerInitCommand(program);

program.parse();
