#!/usr/bin/env node
import { program } from "commander";
import { generateJSDoc } from "./index";

program
  .argument("<file>", "The TypeScript or JavaScript file to process")
  .description(
    "Generate JSDoc comments for the given TypeScript or JavaScript file"
  )
  .action((file) => {
    generateJSDoc(file);
  });

program.parse(process.argv);
