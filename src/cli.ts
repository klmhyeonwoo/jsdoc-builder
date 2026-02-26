#!/usr/bin/env node
import { program } from "commander";
import { generateJSDoc } from "./index";

program
  .argument("<file>", "The TypeScript, JavaScript, JSX, TSX, or Vue file to process")
  .option("-c, --config <path>", "Path to jsdoc-builder config file")
  .option("--no-ai", "Disable AI description generation")
  .description(
    "Generate JSDoc comments for the given TypeScript, JavaScript, JSX, TSX, or Vue file"
  )
  .action(async (file, options: { config?: string; ai?: boolean }) => {
    try {
      await generateJSDoc(file, {
        configPath: options.config,
        disableAI: options.ai === false,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Failed to generate JSDoc: ${message}`);
      process.exitCode = 1;
    }
  });

program.parse(process.argv);
