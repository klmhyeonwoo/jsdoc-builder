#!/usr/bin/env node
import { program } from "commander";
import { generateJSDoc } from "./index";

program
  .argument("<file>", "The TypeScript or JavaScript file to process")
  .description(
    "Generate JSDoc comments for the given TypeScript or JavaScript file"
  )
  .option("--ai", "Enable AI-powered description generation")
  .option(
    "--api-key <key>",
    "OpenAI API key (can also be set via OPENAI_API_KEY environment variable)"
  )
  .option(
    "--model <model>",
    "AI model to use (default: gpt-3.5-turbo)",
    "gpt-3.5-turbo"
  )
  .action(async (file, options) => {
    const apiKey = options.apiKey || process.env.OPENAI_API_KEY;
    const aiEnabled = options.ai && !!apiKey;

    if (options.ai && !apiKey) {
      console.error(
        "Error: AI is enabled but no API key provided. Set OPENAI_API_KEY environment variable or use --api-key option."
      );
      process.exit(1);
    }

    await generateJSDoc(file, {
      aiEnabled,
      apiKey,
      model: options.model,
    });
  });

program.parse(process.argv);
