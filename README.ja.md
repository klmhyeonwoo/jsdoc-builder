# JSDoc Builder

[English](./README.MD) | [한국어](./README.ko.md) | [简体中文](./README.zh-CN.md) | [日本語](./README.ja.md)

JSDoc Builder は、JavaScript/TypeScript のコードに JSDoc コメントを自動生成する CLI/ライブラリです。
JavaScript、TypeScript、JSX、TSX、Vue SFC をサポートします。

## 目次

- [概要](#概要)
- [主な機能](#主な機能)
- [インストール](#インストール)
- [クイックスタート](#クイックスタート)
- [CLI の使い方](#cli-の使い方)
- [設定ファイル](#設定ファイル)
- [AI プロバイダー (OpenAI / Gemini)](#ai-プロバイダー-openai--gemini)
- [説明文の多言語対応（韓国語/英語/中国語/日本語）](#説明文の多言語対応韓国語英語中国語日本語)
- [Vite プラグイン](#vite-プラグイン)
- [プログラム API](#プログラム-api)
- [挙動と安全性](#挙動と安全性)
- [トラブルシューティング](#トラブルシューティング)
- [ライセンス](#ライセンス)

## 概要

- JSDoc の繰り返し作業を減らします。
- JS/TS/Vue 混在プロジェクトでもコメント形式を統一できます。
- 以下の使い方に対応します。
  - CLI
  - ライブラリ API
  - Vite プラグイン

## 主な機能

- 次の対象に JSDoc を生成:
  - 関数宣言
  - 変数に代入されたアロー関数
  - 変数に代入された関数式
- 対応拡張子:
  - `.js`, `.mjs`, `.cjs`
  - `.ts`
  - `.jsx`
  - `.tsx`
  - `.vue`（`<script>` のみ更新）
- 既存 JSDoc があるノードはスキップ。
- 可能な範囲で引数型/戻り値型を推論。
- テンプレートのカスタマイズに対応。
- OpenAI/Gemini による `@description` 生成に対応。
- API キーなし/AI 失敗時は安全にフォールバック。

## インストール

グローバル:

```bash
npm install -g jsdoc-builder
```

プロジェクト:

```bash
npm install --save-dev jsdoc-builder
```

## クイックスタート

1. ファイルを用意:

```ts
function add(a: number, b: number) {
  return a + b;
}
```

2. 実行:

```bash
jsdoc-builder ./example.ts
```

3. 出力:

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

## CLI の使い方

基本:

```bash
jsdoc-builder <file-path>
```

オプション:

```bash
jsdoc-builder <file-path> --config ./jsdoc-builder.config.json
jsdoc-builder <file-path> --no-ai
```

- `-c, --config <path>`: 設定ファイルパス
- `--no-ai`: 設定で AI が有効でも強制的に無効化

## 設定ファイル

デフォルトパスは `./jsdoc-builder.config.json` です。

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

### 設定項目

- `template.descriptionLine`: 説明行テンプレート
- `template.paramLine`: 引数行テンプレート
- `template.returnsLine`: 戻り値行テンプレート
- `includeReturnsWhenVoid`: `false` の場合、`void` 関数の `@returns` を省略
- `ai.enabled`: AI 生成の有効/無効
- `ai.provider`: `"openai"` または `"gemini"`
- `ai.model`: モデル名
- `ai.apiKey`: API キー
- `ai.baseUrl`: エンドポイントのベース URL
- `ai.timeoutMs`: タイムアウト（ミリ秒）
- `ai.promptTemplate`: AI プロンプトテンプレート

### テンプレートのプレースホルダー

- `{{functionName}}` / `${functionName}`
- `{{description}}` / `${description}`
- `{{type}}` / `${type}`
- `{{name}}` / `${name}`
- `{{returnType}}` / `${returnType}`
- `{{paramsCount}}` / `${paramsCount}`

## AI プロバイダー (OpenAI / Gemini)

OpenAI:

- `ai.provider`: `"openai"`
- デフォルトモデル: `gpt-4o-mini`
- デフォルト URL: `https://api.openai.com/v1/chat/completions`
- 環境変数キー: `OPENAI_API_KEY`

Gemini:

- `ai.provider`: `"gemini"`
- デフォルトモデル: `gemini-1.5-flash`
- デフォルト URL: `https://generativelanguage.googleapis.com/v1beta`
- 環境変数キー: `GEMINI_API_KEY` または `GOOGLE_API_KEY`

Gemini 設定例:

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

### API キーがない場合の挙動

1. プロバイダーごとの環境変数を確認
2. 取得できなければ AI を自動的に無効化
3. `@description` は `"<functionName> function"` にフォールバック

## 説明文の多言語対応（韓国語/英語/中国語/日本語）

`ai.promptTemplate` を変更することで、説明文の言語を制御できます。

韓国語例:

```json
{
  "ai": {
    "enabled": true,
    "provider": "openai",
    "promptTemplate": "함수 '{{functionName}}'의 JSDoc 설명을 한국어 한 문장으로 작성해 주세요. 파라미터: {{parameters}}, 반환 타입: {{returnType}}"
  }
}
```

中国語例:

```json
{
  "ai": {
    "enabled": true,
    "provider": "gemini",
    "promptTemplate": "请用中文一句话编写函数 '{{functionName}}' 的 JSDoc 描述。参数: {{parameters}}，返回类型: {{returnType}}"
  }
}
```

日本語例:

```json
{
  "ai": {
    "enabled": true,
    "provider": "openai",
    "promptTemplate": "関数 '{{functionName}}' の JSDoc 説明を日本語で1文で作成してください。引数: {{parameters}}、戻り値型: {{returnType}}"
  }
}
```

## Vite プラグイン

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

主なオプション:

- `apply`: `"serve" | "build" | "both"`（既定値 `"both"`）
- `include`: 処理対象のフィルター
- `exclude`: 除外対象のフィルター
- `extensions`: 対象拡張子
- `GenerateJSDocOptions` も使用可（`configPath`, `config`, `disableAI`）

## プログラム API

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

## 挙動と安全性

- 既存 JSDoc は保持されます。
- 変換対象がない場合は内容を変更しません。
- Vue はテンプレート/スタイルを変更しません。
- AI エラー時も処理は継続し、フォールバック説明を使用します。

## トラブルシューティング

- TypeScript モジュール関連エラー:
  - `tsconfig.json` の Node 型/モジュール解決設定を確認
- AI 説明が生成されない:
  - `ai.enabled: true` を確認
  - API キー（設定または環境変数）を確認
  - エンドポイントへの接続を確認
- 言語が期待どおりでない:
  - `ai.promptTemplate` の言語指示を修正

## ライセンス

MIT. [LICENSE](./LICENSE) を参照。
