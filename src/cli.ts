#!/usr/bin/env node
import { program } from "commander";
import { generateJSDoc } from "./index";

program
  .argument("<file>", "The TypeScript, JavaScript, JSX, TSX, or Vue file to process")
  .description(
    "Generate JSDoc comments for the given TypeScript, JavaScript, JSX, TSX, or Vue file"
  )
  .action((file) => {
    generateJSDoc(file);
  });

program.parse(process.argv);
