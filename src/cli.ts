#!/usr/bin/env node
/**
 * @fileoverview CLI entry point for jsdoc-builder.
 * This module sets up the command-line interface using Commander.js
 * and processes TypeScript/JavaScript files to add JSDoc comments.
 */
import { program } from "commander";
import { generateJSDoc } from "./index";

program
  .argument("<file>", "The TypeScript or JavaScript file to process")
  .description(
    "Generate JSDoc comments for the given TypeScript or JavaScript file"
  )
  .action((file: string) => {
    generateJSDoc(file);
  });

program.parse(process.argv);
