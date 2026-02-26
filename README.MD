# JSDoc Builder

[English](./README.MD) | [한국어](./README.ko.md) | [简体中文](./README.zh-CN.md) | [日本語](./README.ja.md)

JSDoc Builder is a CLI and library that adds JSDoc comments to JavaScript/TypeScript code automatically.
It supports JavaScript, TypeScript, JSX, TSX, and Vue SFC files.

## Table of Contents

- [Why JSDoc Builder](#why-jsdoc-builder)
- [Features](#features)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [CLI Usage](#cli-usage)
- [Config File](#config-file)
- [AI Providers (OpenAI and Gemini)](#ai-providers-openai-and-gemini)
- [Language Support for Descriptions](#language-support-for-descriptions)
- [Vite Plugin Usage](#vite-plugin-usage)
- [Programmatic API](#programmatic-api)
- [Behavior and Safety](#behavior-and-safety)
- [Troubleshooting](#troubleshooting)
- [License](#license)

## Why JSDoc Builder

- Reduces repetitive JSDoc writing.
- Keeps function docs consistent across mixed JS/TS/Vue codebases.
- Works as:
  - CLI for one-off or script-based use
  - Library API for custom tooling
  - Vite plugin for on-the-fly transform during dev/build

## Features

- Generates JSDoc for:
  - Function declarations
  - Arrow functions assigned to variables
  - Function expressions assigned to variables
- Supported file types:
  - `.js`, `.mjs`, `.cjs`
  - `.ts`
  - `.jsx`
  - `.tsx`
  - `.vue` (updates only `<script>` content)
- Skips nodes that already have JSDoc comments.
- Tries to infer parameter and return types.
- Supports custom JSDoc templates via config.
- Supports AI-generated `@description` using OpenAI or Gemini.
- Provides safe fallback when AI key/request is unavailable.

## Installation

Install globally:

```bash
npm install -g jsdoc-builder
```

Or install in a project:

```bash
npm install --save-dev jsdoc-builder
```

## Quick Start

1. Create a source file:

```ts
function add(a: number, b: number) {
  return a + b;
}
```

2. Run CLI:

```bash
jsdoc-builder ./example.ts
```

3. Result:

```ts
/**
 * @description add function
 * @param {number} a
 * @param {number} b
 * @returns {number}
 */
function add(a: number, b: number) {
  return a + b;
}
```

## CLI Usage

Basic:

```bash
jsdoc-builder <file-path>
```

Options:

```bash
jsdoc-builder <file-path> --config ./jsdoc-builder.config.json
jsdoc-builder <file-path> --no-ai
```

- `-c, --config <path>`: custom config file path.
- `--no-ai`: force disable AI descriptions even if config enables AI.

## Config File

Default config location is `./jsdoc-builder.config.json`.

Example:

```json
{
  "template": {
    "descriptionLine": "@description {{description}}",
    "paramLine": "@param {${type}} ${name}",
    "returnsLine": "@returns {${type}}"
  },
  "includeReturnsWhenVoid": true,
  "ai": {
    "enabled": true,
    "provider": "openai",
    "model": "gpt-4o-mini",
    "apiKey": "YOUR_API_KEY",
    "baseUrl": "https://api.openai.com/v1/chat/completions",
    "timeoutMs": 12000,
    "promptTemplate": "Write one concise sentence for '{{functionName}}'. Params: {{parameters}}. Return type: {{returnType}}. Source: {{sourceSnippet}}"
  }
}
```

### Config Fields

- `template.descriptionLine`: template for description line.
- `template.paramLine`: template for each parameter line.
- `template.returnsLine`: template for returns line.
- `includeReturnsWhenVoid`: when `false`, omits `@returns` for `void` functions.
- `ai.enabled`: enables or disables AI generation.
- `ai.provider`: `"openai"` or `"gemini"`.
- `ai.model`: model name for selected provider.
- `ai.apiKey`: provider API key.
- `ai.baseUrl`: provider base endpoint.
- `ai.timeoutMs`: request timeout in milliseconds.
- `ai.promptTemplate`: prompt template used for the AI request.

### Template Placeholders

Supported placeholders in templates:

- `{{functionName}}` or `${functionName}`
- `{{description}}` or `${description}`
- `{{type}}` or `${type}`
- `{{name}}` or `${name}`
- `{{returnType}}` or `${returnType}`
- `{{paramsCount}}` or `${paramsCount}`

## AI Providers (OpenAI and Gemini)

### OpenAI

- `ai.provider`: `"openai"`
- Default model: `gpt-4o-mini`
- Default endpoint: `https://api.openai.com/v1/chat/completions`
- Env fallback key: `OPENAI_API_KEY`

### Gemini

- `ai.provider`: `"gemini"`
- Default model: `gemini-1.5-flash`
- Default base URL: `https://generativelanguage.googleapis.com/v1beta`
- Env fallback key: `GEMINI_API_KEY` or `GOOGLE_API_KEY`

Gemini config example:

```json
{
  "ai": {
    "enabled": true,
    "provider": "gemini",
    "model": "gemini-1.5-flash",
    "apiKey": "YOUR_GEMINI_API_KEY"
  }
}
```

### Missing API Key Behavior

If `ai.apiKey` is missing:

1. JSDoc Builder checks environment variables based on provider.
2. If still missing, AI is disabled automatically.
3. `@description` falls back to `"<functionName> function"`.

## Language Support for Descriptions

JSDoc Builder can generate description text in Korean, English, Chinese, or Japanese by changing `ai.promptTemplate`.

Korean prompt example:

```json
{
  "ai": {
    "enabled": true,
    "provider": "openai",
    "promptTemplate": "함수 '{{functionName}}'의 JSDoc 설명을 한국어 한 문장으로 작성해 주세요. 파라미터: {{parameters}}, 반환 타입: {{returnType}}"
  }
}
```

Chinese prompt example:

```json
{
  "ai": {
    "enabled": true,
    "provider": "gemini",
    "promptTemplate": "请用中文一句话编写函数 '{{functionName}}' 的 JSDoc 描述。参数: {{parameters}}，返回类型: {{returnType}}"
  }
}
```

Japanese prompt example:

```json
{
  "ai": {
    "enabled": true,
    "provider": "openai",
    "promptTemplate": "関数 '{{functionName}}' の JSDoc 説明を日本語で1文で作成してください。引数: {{parameters}}、戻り値型: {{returnType}}"
  }
}
```

## Vite Plugin Usage

```ts
import { defineConfig } from "vite";
import { jsdocBuilderVitePlugin } from "jsdoc-builder/vite";

export default defineConfig({
  plugins: [
    jsdocBuilderVitePlugin({
      apply: "serve",
      configPath: "./jsdoc-builder.config.json",
      include: ["src/"],
      exclude: [/node_modules/, /dist/],
      extensions: [".js", ".jsx", ".ts", ".tsx", ".vue"]
    })
  ]
});
```

Plugin options:

- `apply`: `"serve" | "build" | "both"` (default `"both"`)
- `include`: only process matching files (string includes or RegExp)
- `exclude`: skip matching files
- `extensions`: file extensions to process
- Also supports all `GenerateJSDocOptions` (`configPath`, `config`, `disableAI`)

## Programmatic API

```ts
import { generateJSDoc, generateJSDocFromCode } from "jsdoc-builder";

await generateJSDoc("./src/utils.ts", {
  configPath: "./jsdoc-builder.config.json"
});

const output = await generateJSDocFromCode(
  "/virtual/example.ts",
  "const sum = (a, b) => a + b;",
  {
    config: {
      ai: { enabled: false }
    }
  }
);

console.log(output);
```

### API Reference

- `generateJSDoc(filePath, options?)`: reads a file, transforms it, writes result.
- `generateJSDocFromCode(filePath, code, options?)`: returns transformed code string.

## Behavior and Safety

- Existing JSDoc is preserved.
- If no transform target is found, content is unchanged.
- Vue files keep template/style blocks untouched.
- AI errors do not break processing; fallback description is used.

## Troubleshooting

- `Cannot find module ...` in TypeScript:
  - Check `tsconfig.json` includes Node types.
  - Use `module` and `moduleResolution` values compatible with your TS version.
- AI descriptions are not generated:
  - Confirm `ai.enabled: true`
  - Confirm provider API key is set in config or env
  - Confirm provider endpoint is reachable
- Descriptions are in the wrong language:
  - Update `ai.promptTemplate` with your target language instruction.

## License

MIT. See [LICENSE](./LICENSE).
