# JSDoc Builder

[English](./README.MD) | [한국어](./README.ko.md) | [简体中文](./README.zh-CN.md) | [日本語](./README.ja.md)

JSDoc Builder 是一个 CLI/库，用于自动为 JavaScript/TypeScript 代码生成 JSDoc 注释。
支持 JavaScript、TypeScript、JSX、TSX、Vue SFC。

## 目录

- [简介](#简介)
- [功能](#功能)
- [安装](#安装)
- [快速开始](#快速开始)
- [CLI 用法](#cli-用法)
- [配置文件](#配置文件)
- [AI 提供商 (OpenAI 和 Gemini)](#ai-提供商-openai-和-gemini)
- [描述语言支持（韩语/英语/中文/日语）](#描述语言支持韩语英语中文日语)
- [Vite 插件](#vite-插件)
- [编程 API](#编程-api)
- [行为与安全](#行为与安全)
- [故障排查](#故障排查)
- [许可证](#许可证)

## 简介

- 减少重复编写 JSDoc 的工作量。
- 在 JS/TS/Vue 混合项目中保持注释风格一致。
- 支持以下方式：
  - CLI
  - 库 API
  - Vite 插件

## 功能

- 支持以下目标自动生成注释：
  - 函数声明
  - 赋值给变量的箭头函数
  - 赋值给变量的函数表达式
- 支持文件类型：
  - `.js`, `.mjs`, `.cjs`
  - `.ts`
  - `.jsx`
  - `.tsx`
  - `.vue`（仅修改 `<script>`）
- 已有 JSDoc 的节点会跳过。
- 尽可能推断参数与返回类型。
- 支持通过配置自定义模板。
- 支持 OpenAI/Gemini 生成 `@description`。
- 无 API Key 或 AI 请求失败时会安全降级。

## 安装

全局安装：

```bash
npm install -g jsdoc-builder
```

项目内安装：

```bash
npm install --save-dev jsdoc-builder
```

## 快速开始

1. 示例文件：

```ts
function add(a: number, b: number) {
  return a + b;
}
```

2. 执行：

```bash
jsdoc-builder ./example.ts
```

3. 输出：

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

## CLI 用法

基础命令：

```bash
jsdoc-builder <file-path>
```

选项：

```bash
jsdoc-builder <file-path> --config ./jsdoc-builder.config.json
jsdoc-builder <file-path> --no-ai
```

- `-c, --config <path>`：指定配置文件路径
- `--no-ai`：即使配置中启用 AI，也强制关闭

## 配置文件

默认位置：`./jsdoc-builder.config.json`

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

### 配置项说明

- `template.descriptionLine`：描述行模板
- `template.paramLine`：参数行模板
- `template.returnsLine`：返回行模板
- `includeReturnsWhenVoid`：为 `false` 时，`void` 函数不生成 `@returns`
- `ai.enabled`：是否启用 AI
- `ai.provider`：`"openai"` 或 `"gemini"`
- `ai.model`：模型名
- `ai.apiKey`：API Key
- `ai.baseUrl`：接口基础地址
- `ai.timeoutMs`：超时（毫秒）
- `ai.promptTemplate`：AI 提示词模板

### 模板占位符

- `{{functionName}}` / `${functionName}`
- `{{description}}` / `${description}`
- `{{type}}` / `${type}`
- `{{name}}` / `${name}`
- `{{returnType}}` / `${returnType}`
- `{{paramsCount}}` / `${paramsCount}`

## AI 提供商 (OpenAI 和 Gemini)

OpenAI:

- `ai.provider`: `"openai"`
- 默认模型：`gpt-4o-mini`
- 默认地址：`https://api.openai.com/v1/chat/completions`
- 环境变量：`OPENAI_API_KEY`

Gemini:

- `ai.provider`: `"gemini"`
- 默认模型：`gemini-1.5-flash`
- 默认地址：`https://generativelanguage.googleapis.com/v1beta`
- 环境变量：`GEMINI_API_KEY` 或 `GOOGLE_API_KEY`

Gemini 示例：

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

### 没有 API Key 时的行为

1. 按 provider 检查环境变量。
2. 若仍为空，自动关闭 AI。
3. `@description` 回退为 `"<functionName> function"`。

## 描述语言支持（韩语/英语/中文/日语）

可通过 `ai.promptTemplate` 控制生成语言。

韩语示例：

```json
{
  "ai": {
    "enabled": true,
    "provider": "openai",
    "promptTemplate": "함수 '{{functionName}}'의 JSDoc 설명을 한국어 한 문장으로 작성해 주세요. 파라미터: {{parameters}}, 반환 타입: {{returnType}}"
  }
}
```

中文示例：

```json
{
  "ai": {
    "enabled": true,
    "provider": "gemini",
    "promptTemplate": "请用中文一句话编写函数 '{{functionName}}' 的 JSDoc 描述。参数: {{parameters}}，返回类型: {{returnType}}"
  }
}
```

日语示例：

```json
{
  "ai": {
    "enabled": true,
    "provider": "openai",
    "promptTemplate": "関数 '{{functionName}}' の JSDoc 説明を日本語で1文で作成してください。引数: {{parameters}}、戻り値型: {{returnType}}"
  }
}
```

## Vite 插件

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

插件选项：

- `apply`：`"serve" | "build" | "both"`（默认 `"both"`）
- `include`：仅处理匹配文件
- `exclude`：排除匹配文件
- `extensions`：处理的扩展名
- 同时支持 `GenerateJSDocOptions`（`configPath`, `config`, `disableAI`）

## 编程 API

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

## 行为与安全

- 保留已有 JSDoc。
- 找不到可转换目标时，内容不变。
- Vue 文件只改 `<script>`，不改模板和样式。
- AI 失败不会中断流程，会使用 fallback 描述。

## 故障排查

- TypeScript 模块错误：
  - 检查 `tsconfig.json` 的 Node 类型和模块解析配置。
- AI 未生效：
  - 检查 `ai.enabled: true`
  - 检查 API Key（配置或环境变量）
  - 检查 provider 地址可访问
- 语言不符合预期：
  - 调整 `ai.promptTemplate` 的语言指令。

## 许可证

MIT，见 [LICENSE](./LICENSE)。
