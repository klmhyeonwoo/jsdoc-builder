# JSDoc Builder

[English](./README.MD) | [한국어](./README.ko.md) | [简体中文](./README.zh-CN.md) | [日本語](./README.ja.md)

JSDoc Builder는 JavaScript/TypeScript 코드에 JSDoc 주석을 자동으로 추가해주는 CLI/라이브러리입니다.
JavaScript, TypeScript, JSX, TSX, Vue SFC를 지원합니다.

## 목차

- [개요](#개요)
- [주요 기능](#주요-기능)
- [설치](#설치)
- [빠른 시작](#빠른-시작)
- [CLI 사용법](#cli-사용법)
- [설정 파일](#설정-파일)
- [AI 제공자 (OpenAI, Gemini)](#ai-제공자-openai-gemini)
- [설명 언어 지원 (한국어/영어/중국어/일본어)](#설명-언어-지원-한국어영어중국어일본어)
- [Vite 플러그인](#vite-플러그인)
- [프로그래밍 API](#프로그래밍-api)
- [동작 특성](#동작-특성)
- [문제 해결](#문제-해결)
- [라이선스](#라이선스)

## 개요

- 반복적인 JSDoc 작성 작업을 줄입니다.
- JS/TS/Vue 혼합 프로젝트에서 문서 형식을 일관되게 맞춥니다.
- 아래 방식으로 사용할 수 있습니다.
  - CLI
  - 라이브러리 API
  - Vite 플러그인

## 주요 기능

- 아래 대상에 JSDoc 생성:
  - 함수 선언
  - 변수에 할당된 화살표 함수
  - 변수에 할당된 함수 표현식
- 지원 파일 확장자:
  - `.js`, `.mjs`, `.cjs`
  - `.ts`
  - `.jsx`
  - `.tsx`
  - `.vue` (`<script>` 영역만 변경)
- 기존 JSDoc이 있으면 건너뜁니다.
- 파라미터/반환 타입을 가능한 범위에서 추론합니다.
- 템플릿 커스터마이징을 지원합니다.
- OpenAI/Gemini 기반 AI `@description` 생성을 지원합니다.
- API 키가 없거나 AI 요청 실패 시 안전 fallback으로 동작합니다.

## 설치

전역 설치:

```bash
npm install -g jsdoc-builder
```

프로젝트 설치:

```bash
npm install --save-dev jsdoc-builder
```

## 빠른 시작

1. 파일 작성:

```ts
function add(a: number, b: number) {
  return a + b;
}
```

2. 실행:

```bash
jsdoc-builder ./example.ts
```

3. 결과:

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

## CLI 사용법

기본:

```bash
jsdoc-builder <file-path>
```

옵션:

```bash
jsdoc-builder <file-path> --config ./jsdoc-builder.config.json
jsdoc-builder <file-path> --no-ai
```

- `-c, --config <path>`: 설정 파일 경로 지정
- `--no-ai`: 설정에 AI가 켜져 있어도 강제로 AI 끔

## 설정 파일

기본 경로는 `./jsdoc-builder.config.json`입니다.

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

### 설정 항목

- `template.descriptionLine`: 설명 라인 템플릿
- `template.paramLine`: 파라미터 라인 템플릿
- `template.returnsLine`: 반환 라인 템플릿
- `includeReturnsWhenVoid`: `false`면 `void` 함수에서 `@returns` 생략
- `ai.enabled`: AI 설명 생성 사용 여부
- `ai.provider`: `"openai"` 또는 `"gemini"`
- `ai.model`: 모델명
- `ai.apiKey`: API 키
- `ai.baseUrl`: API 엔드포인트 기본 URL
- `ai.timeoutMs`: 타임아웃(ms)
- `ai.promptTemplate`: 프롬프트 템플릿

### 템플릿 플레이스홀더

- `{{functionName}}` / `${functionName}`
- `{{description}}` / `${description}`
- `{{type}}` / `${type}`
- `{{name}}` / `${name}`
- `{{returnType}}` / `${returnType}`
- `{{paramsCount}}` / `${paramsCount}`

## AI 제공자 (OpenAI, Gemini)

OpenAI:

- `ai.provider`: `"openai"`
- 기본 모델: `gpt-4o-mini`
- 기본 URL: `https://api.openai.com/v1/chat/completions`
- 환경변수 키: `OPENAI_API_KEY`

Gemini:

- `ai.provider`: `"gemini"`
- 기본 모델: `gemini-1.5-flash`
- 기본 URL: `https://generativelanguage.googleapis.com/v1beta`
- 환경변수 키: `GEMINI_API_KEY` 또는 `GOOGLE_API_KEY`

Gemini 예시:

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

### API 키가 없을 때

1. provider에 맞는 환경변수 키를 확인합니다.
2. 없으면 AI를 자동 비활성화합니다.
3. `@description`은 `"<functionName> function"`으로 fallback 됩니다.

## 설명 언어 지원 (한국어/영어/중국어/일본어)

설명 언어는 `ai.promptTemplate`으로 제어할 수 있습니다.

한국어 예시:

```json
{
  "ai": {
    "enabled": true,
    "provider": "openai",
    "promptTemplate": "함수 '{{functionName}}'의 JSDoc 설명을 한국어 한 문장으로 작성해 주세요. 파라미터: {{parameters}}, 반환 타입: {{returnType}}"
  }
}
```

중국어 예시:

```json
{
  "ai": {
    "enabled": true,
    "provider": "gemini",
    "promptTemplate": "请用中文一句话编写函数 '{{functionName}}' 的 JSDoc 描述。参数: {{parameters}}，返回类型: {{returnType}}"
  }
}
```

일본어 예시:

```json
{
  "ai": {
    "enabled": true,
    "provider": "openai",
    "promptTemplate": "関数 '{{functionName}}' の JSDoc 説明を日本語で1文で作成してください。引数: {{parameters}}、戻り値型: {{returnType}}"
  }
}
```

## Vite 플러그인

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

옵션:

- `apply`: `"serve" | "build" | "both"` (기본값 `"both"`)
- `include`: 처리할 파일 필터
- `exclude`: 제외할 파일 필터
- `extensions`: 처리할 확장자
- `GenerateJSDocOptions`도 함께 사용 가능 (`configPath`, `config`, `disableAI`)

## 프로그래밍 API

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

## 동작 특성

- 기존 JSDoc은 유지됩니다.
- 변환 대상이 없으면 원본을 그대로 유지합니다.
- Vue 파일은 템플릿/스타일 블록을 건드리지 않습니다.
- AI 오류가 나도 전체 처리를 실패시키지 않습니다.

## 문제 해결

- TypeScript 모듈 에러가 발생하면:
  - `tsconfig.json`의 Node 타입/모듈 설정을 확인하세요.
- AI 설명이 생성되지 않으면:
  - `ai.enabled: true` 확인
  - API 키 설정 확인
  - provider endpoint 연결 확인
- 설명 언어가 원하는 언어가 아니면:
  - `ai.promptTemplate` 언어 지시문을 수정하세요.

## 라이선스

MIT. [LICENSE](./LICENSE) 참고.
