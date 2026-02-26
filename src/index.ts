import * as ts from "typescript";
import * as fs from "fs";
import * as path from "path";
import * as https from "https";
import { URL } from "url";

type AIProvider = "openai" | "gemini";

interface JSDocTemplateConfig {
  descriptionLine?: string;
  paramLine?: string;
  returnsLine?: string;
}

interface AIConfig {
  provider?: AIProvider;
  enabled?: boolean;
  apiKey?: string;
  model?: string;
  baseUrl?: string;
  timeoutMs?: number;
  promptTemplate?: string;
}

export interface JSDocBuilderConfig {
  template?: JSDocTemplateConfig;
  ai?: AIConfig;
  includeReturnsWhenVoid?: boolean;
}

export interface GenerateJSDocOptions {
  configPath?: string;
  config?: JSDocBuilderConfig;
  disableAI?: boolean;
}

interface NormalizedConfig {
  template: {
    descriptionLine: string;
    paramLine: string;
    returnsLine: string;
  };
  ai: {
    provider: AIProvider;
    enabled: boolean;
    apiKey?: string;
    model: string;
    baseUrl: string;
    timeoutMs: number;
    promptTemplate: string;
  };
  includeReturnsWhenVoid: boolean;
}

interface ParsedTarget {
  key: string;
  functionName: string;
  parameters: ts.NodeArray<ts.ParameterDeclaration>;
  returnTypeText: string;
  sourceSnippet: string;
}

interface AIDescriptionContext {
  functionName: string;
  returnType: string;
  parameters: Array<{ name: string; type: string }>;
  sourceSnippet: string;
}

const DEFAULT_PROMPT_TEMPLATE =
  "Write one concise sentence for the JSDoc @description of function '{{functionName}}'. Parameters: {{parameters}}. Return type: {{returnType}}. Source: {{sourceSnippet}}";

const OPENAI_AI_DEFAULTS = {
  provider: "openai" as const,
  model: "gpt-4o-mini",
  baseUrl: "https://api.openai.com/v1/chat/completions",
  timeoutMs: 12000,
  promptTemplate: DEFAULT_PROMPT_TEMPLATE,
};

const GEMINI_AI_DEFAULTS = {
  provider: "gemini" as const,
  model: "gemini-1.5-flash",
  baseUrl: "https://generativelanguage.googleapis.com/v1beta",
  timeoutMs: 12000,
  promptTemplate: DEFAULT_PROMPT_TEMPLATE,
};

const DEFAULT_CONFIG: NormalizedConfig = {
  template: {
    descriptionLine: "@description {{description}}",
    paramLine: "@param {${type}} ${name}",
    returnsLine: "@returns {${type}}",
  },
  ai: {
    provider: OPENAI_AI_DEFAULTS.provider,
    enabled: false,
    model: OPENAI_AI_DEFAULTS.model,
    baseUrl: OPENAI_AI_DEFAULTS.baseUrl,
    timeoutMs: OPENAI_AI_DEFAULTS.timeoutMs,
    promptTemplate: OPENAI_AI_DEFAULTS.promptTemplate,
  },
  includeReturnsWhenVoid: true,
};

/**
 * Parses a TypeScript, JavaScript, JSX, TSX, or Vue file and adds JSDoc comments to functions.
 * Skips functions that already have JSDoc comments.
 * @param filePath - The path of the file to process.
 */
export async function generateJSDoc(
  filePath: string,
  options: GenerateJSDocOptions = {}
): Promise<void> {
  const sourceCode = fs.readFileSync(filePath, "utf-8");
  const updatedCode = await generateJSDocFromCode(filePath, sourceCode, options);

  if (updatedCode !== sourceCode) {
    fs.writeFileSync(filePath, updatedCode, "utf-8");
  }
}

export async function generateJSDocFromCode(
  filePath: string,
  code: string,
  options: GenerateJSDocOptions = {}
): Promise<string> {
  const config = loadConfig(options);
  return transformCode(filePath, code, config);
}

async function transformCode(
  filePath: string,
  originalCode: string,
  config: NormalizedConfig
): Promise<string> {
  const ext = path.extname(filePath).toLowerCase();

  let sourceCode = originalCode;
  let vueScriptRange: { start: number; end: number } | undefined;
  let scriptKind = resolveScriptKind(ext);

  if (ext === ".vue") {
    const vueScript = extractVueScript(originalCode);
    if (!vueScript) {
      return originalCode;
    }

    sourceCode = vueScript.content;
    vueScriptRange = { start: vueScript.contentStart, end: vueScript.contentEnd };
    scriptKind = resolveScriptKindFromVue(vueScript.openTag);
  }

  const sourceFile = ts.createSourceFile(
    filePath,
    sourceCode,
    ts.ScriptTarget.Latest,
    true,
    scriptKind
  );
  const checker = createTypeChecker(filePath, sourceCode, scriptKind, sourceFile);

  const targets = collectTargets(sourceFile, sourceCode, checker);
  const commentMap = await buildCommentMap(targets, config, checker);

  if (commentMap.size === 0) {
    return originalCode;
  }

  const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });

  const transformer: ts.TransformerFactory<ts.SourceFile> = (context) => {
    const visit = (node: ts.Node): ts.Node => {
      const key = makeNodeKey(node);
      const comment = commentMap.get(key);

      if (comment) {
        ts.addSyntheticLeadingComment(
          node,
          ts.SyntaxKind.MultiLineCommentTrivia,
          comment,
          true
        );
      }

      return ts.visitEachChild(node, visit, context);
    };

    return (node: ts.SourceFile) => ts.visitNode(node, visit) as ts.SourceFile;
  };

  const result = ts.transform(sourceFile, [transformer]);
  const transformedSourceFile = result.transformed[0];
  let transformedScriptCode = printer.printFile(transformedSourceFile);
  result.dispose();

  if (ext === ".vue" && vueScriptRange) {
    const originalScriptContent = originalCode.slice(
      vueScriptRange.start,
      vueScriptRange.end
    );
    if (originalScriptContent.startsWith("\n") && !transformedScriptCode.startsWith("\n")) {
      transformedScriptCode = `\n${transformedScriptCode}`;
    }
    if (originalScriptContent.endsWith("\n") && !transformedScriptCode.endsWith("\n")) {
      transformedScriptCode = `${transformedScriptCode}\n`;
    }

    const updatedCode =
      originalCode.slice(0, vueScriptRange.start) +
      transformedScriptCode +
      originalCode.slice(vueScriptRange.end);
    return updatedCode;
  }

  return transformedScriptCode;
}

function loadConfig(options: GenerateJSDocOptions): NormalizedConfig {
  const fileConfig = loadConfigFile(options.configPath);
  const merged = mergeDeep(
    DEFAULT_CONFIG,
    fileConfig,
    options.config ?? {},
    options.disableAI ? { ai: { enabled: false } } : {}
  );

  merged.ai.provider = normalizeProvider(merged.ai.provider);
  applyProviderDefaults(merged.ai);

  const envApiKey = resolveApiKeyFromEnv(merged.ai.provider);
  if (!merged.ai.apiKey && envApiKey) {
    merged.ai.apiKey = envApiKey;
  }

  if (merged.ai.enabled && !merged.ai.apiKey) {
    merged.ai.enabled = false;
  }

  return merged;
}

function loadConfigFile(configPath?: string): Partial<JSDocBuilderConfig> {
  const targetPath =
    configPath || path.resolve(process.cwd(), "jsdoc-builder.config.json");

  if (!fs.existsSync(targetPath)) {
    return {};
  }

  try {
    const raw = fs.readFileSync(targetPath, "utf-8");
    const parsed = JSON.parse(raw);

    if (!isObject(parsed)) {
      return {};
    }

    return parsed as Partial<JSDocBuilderConfig>;
  } catch {
    return {};
  }
}

function extractVueScript(sourceCode: string):
  | { openTag: string; content: string; contentStart: number; contentEnd: number }
  | undefined {
  const scriptRegex = /<script\b[^>]*>([\s\S]*?)<\/script\s*>/i;
  const match = scriptRegex.exec(sourceCode);

  if (!match) {
    return undefined;
  }

  const full = match[0];
  const content = match[1] ?? "";
  const contentOffset = full.indexOf(content);
  const fullStart = match.index;
  const contentStart = fullStart + contentOffset;
  const contentEnd = contentStart + content.length;
  const openTag = full.slice(0, contentOffset);

  return {
    openTag,
    content,
    contentStart,
    contentEnd,
  };
}

function resolveScriptKind(ext: string): ts.ScriptKind {
  if (ext === ".js" || ext === ".mjs" || ext === ".cjs") {
    return ts.ScriptKind.JS;
  }

  if (ext === ".jsx") {
    return ts.ScriptKind.JSX;
  }

  if (ext === ".tsx") {
    return ts.ScriptKind.TSX;
  }

  return ts.ScriptKind.TS;
}

function resolveScriptKindFromVue(openTag: string): ts.ScriptKind {
  const langMatch = openTag.match(/lang\s*=\s*["']?([a-zA-Z0-9-]+)/i);
  const lang = (langMatch?.[1] || "js").toLowerCase();

  if (lang.includes("tsx")) {
    return ts.ScriptKind.TSX;
  }

  if (lang.includes("jsx")) {
    return ts.ScriptKind.JSX;
  }

  if (lang.includes("ts")) {
    return ts.ScriptKind.TS;
  }

  return ts.ScriptKind.JS;
}

function collectTargets(
  sourceFile: ts.SourceFile,
  sourceText: string,
  checker?: ts.TypeChecker
): ParsedTarget[] {
  const targets: ParsedTarget[] = [];

  const walk = (node: ts.Node) => {
    if (ts.isFunctionDeclaration(node) && node.name) {
      const commentNode = node;
      if (!hasJSDoc(commentNode, sourceText)) {
        targets.push(
          createTarget(
            commentNode,
            node.name.text,
            node.parameters,
            inferReturnTypeText(node, checker),
            node.getText(sourceFile)
          )
        );
      }
    }

    if (
      ts.isVariableDeclaration(node) &&
      node.initializer &&
      (ts.isArrowFunction(node.initializer) || ts.isFunctionExpression(node.initializer))
    ) {
      const functionNode = node.initializer;
      const commentNode = resolveVariableCommentNode(node);

      if (!hasJSDoc(commentNode, sourceText)) {
        targets.push(
          createTarget(
            commentNode,
            getFunctionNameFromVariable(node),
            functionNode.parameters,
            inferReturnTypeText(functionNode, checker),
            functionNode.getText(sourceFile)
          )
        );
      }
    }

    ts.forEachChild(node, walk);
  };

  walk(sourceFile);

  return targets;
}

function resolveVariableCommentNode(node: ts.VariableDeclaration): ts.Node {
  const declarationList = node.parent;

  if (
    ts.isVariableDeclarationList(declarationList) &&
    declarationList.declarations.length === 1 &&
    ts.isVariableStatement(declarationList.parent)
  ) {
    return declarationList.parent;
  }

  return node;
}

function createTarget(
  commentNode: ts.Node,
  functionName: string,
  parameters: ts.NodeArray<ts.ParameterDeclaration>,
  returnTypeText: string,
  sourceSnippet: string
): ParsedTarget {
  return {
    key: makeNodeKey(commentNode),
    functionName,
    parameters,
    returnTypeText,
    sourceSnippet,
  };
}

async function buildCommentMap(
  targets: ParsedTarget[],
  config: NormalizedConfig,
  checker?: ts.TypeChecker
): Promise<Map<string, string>> {
  const entries: Array<readonly [string, string]> = [];

  for (const target of targets) {
    const params = target.parameters.map((param, index) => ({
      name: getParameterName(param, index),
      type: inferParameterType(param, checker),
    }));

    const description = await createDescription(
      {
        functionName: target.functionName,
        returnType: target.returnTypeText,
        parameters: params,
        sourceSnippet: target.sourceSnippet,
      },
      config
    );

    const comment = createJSDocComment(
      target.functionName,
      params,
      target.returnTypeText,
      description,
      config
    );

    entries.push([target.key, comment] as const);
  }

  return new Map(entries);
}

async function createDescription(
  context: AIDescriptionContext,
  config: NormalizedConfig
): Promise<string> {
  if (!config.ai.enabled || !config.ai.apiKey) {
    return `${context.functionName} function`;
  }

  const aiDescription = await requestDescriptionFromAI(context, config.ai);

  if (!aiDescription) {
    return `${context.functionName} function`;
  }

  return aiDescription;
}

function createJSDocComment(
  functionName: string,
  parameters: Array<{ name: string; type: string }>,
  returnType: string,
  description: string,
  config: NormalizedConfig
): string {
  const lines: string[] = [];

  lines.push(
    formatTemplate(config.template.descriptionLine, {
      functionName,
      description,
      returnType,
      paramsCount: String(parameters.length),
    })
  );

  for (const param of parameters) {
    lines.push(
      formatTemplate(config.template.paramLine, {
        functionName,
        description,
        type: param.type,
        name: param.name,
        returnType,
      })
    );
  }

  if (config.includeReturnsWhenVoid || returnType !== "void") {
    lines.push(
      formatTemplate(config.template.returnsLine, {
        functionName,
        description,
        type: returnType,
        returnType,
      })
    );
  }

  const withPrefix = lines.map((line) => ` * ${line}`);
  return `*\n${withPrefix.join("\n")}\n `;
}

async function requestDescriptionFromAI(
  context: AIDescriptionContext,
  aiConfig: NormalizedConfig["ai"]
): Promise<string | undefined> {
  if (!aiConfig.apiKey) {
    return undefined;
  }

  const prompt = formatTemplate(aiConfig.promptTemplate, {
    functionName: context.functionName,
    returnType: context.returnType,
    parameters: context.parameters.map((p) => `${p.name}:${p.type}`).join(", "),
    sourceSnippet: context.sourceSnippet.replace(/\s+/g, " ").trim().slice(0, 300),
  });

  if (aiConfig.provider === "gemini") {
    return requestDescriptionFromGemini(prompt, aiConfig);
  }

  return requestDescriptionFromOpenAI(prompt, aiConfig);
}

async function requestDescriptionFromOpenAI(
  prompt: string,
  aiConfig: NormalizedConfig["ai"]
): Promise<string | undefined> {
  const payload = {
    model: aiConfig.model,
    messages: [
      {
        role: "system",
        content:
          "You write concise JSDoc descriptions. Return a single sentence with no markdown.",
      },
      { role: "user", content: prompt },
    ],
    temperature: 0.2,
  };

  try {
    const response = await postJson(
      aiConfig.baseUrl,
      payload,
      aiConfig.timeoutMs,
      {
        Authorization: `Bearer ${aiConfig.apiKey}`,
      }
    );
    const content = response?.choices?.[0]?.message?.content;

    if (typeof content !== "string") {
      return undefined;
    }

    return content.replace(/[\r\n]+/g, " ").trim();
  } catch {
    return undefined;
  }
}

async function requestDescriptionFromGemini(
  prompt: string,
  aiConfig: NormalizedConfig["ai"]
): Promise<string | undefined> {
  if (!aiConfig.apiKey) {
    return undefined;
  }

  const endpoint = buildGeminiEndpoint(aiConfig.baseUrl, aiConfig.model, aiConfig.apiKey);

  const payload = {
    systemInstruction: {
      parts: [
        {
          text: "You write concise JSDoc descriptions. Return a single sentence with no markdown.",
        },
      ],
    },
    contents: [
      {
        role: "user",
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: {
      temperature: 0.2,
    },
  };

  try {
    const response = await postJson(endpoint, payload, aiConfig.timeoutMs);
    const parts = response?.candidates?.[0]?.content?.parts;

    if (!Array.isArray(parts)) {
      return undefined;
    }

    const content = parts
      .map((part) => (typeof part?.text === "string" ? part.text : ""))
      .join(" ")
      .trim();

    if (!content) {
      return undefined;
    }

    return content.replace(/[\r\n]+/g, " ").trim();
  } catch {
    return undefined;
  }
}

function postJson(
  endpoint: string,
  payload: unknown,
  timeoutMs: number,
  headers: Record<string, string> = {}
): Promise<any> {
  const url = new URL(endpoint);

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        protocol: url.protocol,
        hostname: url.hostname,
        path: `${url.pathname}${url.search}`,
        method: "POST",
        port: url.port || undefined,
        headers: {
          "Content-Type": "application/json",
          ...headers,
        },
      },
      (res) => {
        let body = "";
        res.on("data", (chunk) => {
          body += chunk;
        });
        res.on("end", () => {
          if (!res.statusCode || res.statusCode >= 400) {
            reject(new Error("AI request failed"));
            return;
          }

          try {
            resolve(JSON.parse(body));
          } catch {
            reject(new Error("Invalid AI response"));
          }
        });
      }
    );

    req.setTimeout(timeoutMs, () => {
      req.destroy(new Error("AI request timeout"));
    });

    req.on("error", reject);
    req.write(JSON.stringify(payload));
    req.end();
  });
}

function hasJSDoc(node: ts.Node, sourceText: string): boolean {
  if (ts.getJSDocCommentsAndTags(node).length > 0) {
    return true;
  }

  const ranges = ts.getLeadingCommentRanges(sourceText, node.getFullStart()) ?? [];
  return ranges.some((range) => sourceText.slice(range.pos, range.end).startsWith("/**"));
}

function inferReturnTypeText(
  node: ts.FunctionLikeDeclaration,
  checker?: ts.TypeChecker
): string {
  if (checker) {
    const signature = checker.getSignatureFromDeclaration(
      node as ts.SignatureDeclaration
    );
    if (signature) {
      const returnType = checker.getReturnTypeOfSignature(signature);
      const typeText = checker.typeToString(returnType);
      if (typeText && typeText !== "{}") {
        return typeText;
      }
    }
  }

  const parameterTypes = getParameterTypeMap(node.parameters, checker);

  if (node.type) {
    return node.type.getText();
  }

  if (!node.body) {
    return "void";
  }

  if (ts.isArrowFunction(node) && !ts.isBlock(node.body)) {
    return finalizeReturnType(inferExpressionType(node.body, parameterTypes), node);
  }

  const returnTypes = new Set<string>();

  const walk = (current: ts.Node) => {
    if (current !== node && isFunctionLike(current)) {
      return;
    }

    if (ts.isReturnStatement(current)) {
      if (!current.expression) {
        returnTypes.add("void");
      } else {
        returnTypes.add(inferExpressionType(current.expression, parameterTypes));
      }
    }

    ts.forEachChild(current, walk);
  };

  walk(node.body);

  if (returnTypes.size === 0) {
    return "void";
  }

  const types = Array.from(returnTypes).filter((type) => type !== "void");
  if (types.length === 0) {
    return finalizeReturnType("void", node);
  }

  return finalizeReturnType(types.join(" | "), node);
}

function inferExpressionType(
  expression: ts.Expression,
  parameterTypes: Map<string, string>
): string {
  if (ts.isParenthesizedExpression(expression)) {
    return inferExpressionType(expression.expression, parameterTypes);
  }

  if (ts.isNumericLiteral(expression)) {
    return "number";
  }

  if (
    ts.isStringLiteral(expression) ||
    ts.isNoSubstitutionTemplateLiteral(expression) ||
    ts.isTemplateExpression(expression)
  ) {
    return "string";
  }

  if (expression.kind === ts.SyntaxKind.TrueKeyword || expression.kind === ts.SyntaxKind.FalseKeyword) {
    return "boolean";
  }

  if (ts.isArrayLiteralExpression(expression)) {
    return "Array<any>";
  }

  if (ts.isObjectLiteralExpression(expression)) {
    return "object";
  }

  if (expression.kind === ts.SyntaxKind.NullKeyword) {
    return "null";
  }

  if (ts.isArrowFunction(expression) || ts.isFunctionExpression(expression)) {
    return "Function";
  }

  if (ts.isIdentifier(expression)) {
    return parameterTypes.get(expression.text) || "any";
  }

  if (ts.isAsExpression(expression)) {
    return expression.type.getText();
  }

  if (ts.isTypeAssertionExpression(expression)) {
    return expression.type.getText();
  }

  if (ts.isPrefixUnaryExpression(expression)) {
    if (expression.operator === ts.SyntaxKind.ExclamationToken) {
      return "boolean";
    }
    if (
      expression.operator === ts.SyntaxKind.PlusToken ||
      expression.operator === ts.SyntaxKind.MinusToken
    ) {
      return "number";
    }
  }

  if (ts.isBinaryExpression(expression)) {
    const left = inferExpressionType(expression.left, parameterTypes);
    const right = inferExpressionType(expression.right, parameterTypes);
    const operator = expression.operatorToken.kind;

    if (operator === ts.SyntaxKind.PlusToken) {
      if (left === "string" || right === "string") {
        return "string";
      }
      if (left === "number" && right === "number") {
        return "number";
      }
      return "any";
    }

    if (
      operator === ts.SyntaxKind.MinusToken ||
      operator === ts.SyntaxKind.AsteriskToken ||
      operator === ts.SyntaxKind.SlashToken ||
      operator === ts.SyntaxKind.PercentToken ||
      operator === ts.SyntaxKind.AsteriskAsteriskToken
    ) {
      return "number";
    }

    if (
      operator === ts.SyntaxKind.GreaterThanToken ||
      operator === ts.SyntaxKind.GreaterThanEqualsToken ||
      operator === ts.SyntaxKind.LessThanToken ||
      operator === ts.SyntaxKind.LessThanEqualsToken ||
      operator === ts.SyntaxKind.EqualsEqualsToken ||
      operator === ts.SyntaxKind.EqualsEqualsEqualsToken ||
      operator === ts.SyntaxKind.ExclamationEqualsToken ||
      operator === ts.SyntaxKind.ExclamationEqualsEqualsToken ||
      operator === ts.SyntaxKind.InstanceOfKeyword ||
      operator === ts.SyntaxKind.InKeyword
    ) {
      return "boolean";
    }

    if (
      operator === ts.SyntaxKind.AmpersandAmpersandToken ||
      operator === ts.SyntaxKind.BarBarToken ||
      operator === ts.SyntaxKind.QuestionQuestionToken
    ) {
      return left === right ? left : `${left} | ${right}`;
    }

    if (
      operator === ts.SyntaxKind.EqualsToken ||
      operator === ts.SyntaxKind.PlusEqualsToken ||
      operator === ts.SyntaxKind.MinusEqualsToken ||
      operator === ts.SyntaxKind.SlashEqualsToken ||
      operator === ts.SyntaxKind.AsteriskEqualsToken ||
      operator === ts.SyntaxKind.PercentEqualsToken
    ) {
      return right;
    }
  }

  if (ts.isAwaitExpression(expression)) {
    return "Promise<any>";
  }

  if (ts.isConditionalExpression(expression)) {
    const whenTrue = inferExpressionType(expression.whenTrue, parameterTypes);
    const whenFalse = inferExpressionType(expression.whenFalse, parameterTypes);
    return whenTrue === whenFalse ? whenTrue : `${whenTrue} | ${whenFalse}`;
  }

  return "any";
}

function inferParameterType(
  param: ts.ParameterDeclaration,
  checker?: ts.TypeChecker
): string {
  if (checker) {
    const type = checker.getTypeAtLocation(param);
    const typeText = checker.typeToString(type);
    if (typeText && typeText !== "{}") {
      return typeText;
    }
  }

  if (param.type) {
    return param.type.getText();
  }

  if (param.initializer) {
    return inferExpressionType(param.initializer, new Map());
  }

  if (param.dotDotDotToken) {
    return "Array<any>";
  }

  return "any";
}

function getFunctionNameFromVariable(node: ts.VariableDeclaration): string {
  if (ts.isIdentifier(node.name)) {
    return node.name.text;
  }

  return "anonymousFunction";
}

function getParameterName(param: ts.ParameterDeclaration, index: number): string {
  if (ts.isIdentifier(param.name)) {
    return param.name.text;
  }

  return `param${index + 1}`;
}

function makeNodeKey(node: ts.Node): string {
  return `${node.kind}:${node.getStart()}:${node.getEnd()}`;
}

function formatTemplate(template: string, values: Record<string, string>): string {
  let output = template;
  for (const [key, value] of Object.entries(values)) {
    output = output.replace(new RegExp(`{{\\s*${escapeRegExp(key)}\\s*}}`, "g"), value);
    output = output.replace(new RegExp(`\\$\\{\\s*${escapeRegExp(key)}\\s*\\}`, "g"), value);
  }
  return output;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&");
}

function mergeDeep(...sources: Array<Partial<JSDocBuilderConfig> | NormalizedConfig>): NormalizedConfig {
  const result: NormalizedConfig = {
    template: { ...DEFAULT_CONFIG.template },
    ai: { ...DEFAULT_CONFIG.ai },
    includeReturnsWhenVoid: DEFAULT_CONFIG.includeReturnsWhenVoid,
  };

  for (const source of sources) {
    if (!source || !isObject(source)) {
      continue;
    }

    if ("template" in source && isObject(source.template)) {
      result.template = {
        ...result.template,
        ...source.template,
      };
    }

    if ("ai" in source && isObject(source.ai)) {
      result.ai = {
        ...result.ai,
        ...source.ai,
      };
    }

    if (typeof source.includeReturnsWhenVoid === "boolean") {
      result.includeReturnsWhenVoid = source.includeReturnsWhenVoid;
    }
  }

  return result;
}

function getParameterTypeMap(
  parameters: ts.NodeArray<ts.ParameterDeclaration>,
  checker?: ts.TypeChecker
): Map<string, string> {
  const map = new Map<string, string>();

  parameters.forEach((param) => {
    if (ts.isIdentifier(param.name)) {
      map.set(param.name.text, inferParameterType(param, checker));
    }
  });

  return map;
}

function finalizeReturnType(
  inferredType: string,
  node: ts.FunctionLikeDeclaration
): string {
  const isAsync = !!node.modifiers?.some(
    (modifier) => modifier.kind === ts.SyntaxKind.AsyncKeyword
  );

  if (!isAsync) {
    return inferredType;
  }

  if (inferredType.startsWith("Promise<")) {
    return inferredType;
  }

  return `Promise<${inferredType}>`;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFunctionLike(node: ts.Node): node is ts.FunctionLikeDeclaration {
  return (
    ts.isFunctionDeclaration(node) ||
    ts.isFunctionExpression(node) ||
    ts.isArrowFunction(node) ||
    ts.isMethodDeclaration(node) ||
    ts.isGetAccessorDeclaration(node) ||
    ts.isSetAccessorDeclaration(node) ||
    ts.isConstructorDeclaration(node)
  );
}

function normalizeProvider(provider: unknown): AIProvider {
  return provider === "gemini" ? "gemini" : "openai";
}

function resolveApiKeyFromEnv(provider: AIProvider): string | undefined {
  if (provider === "gemini") {
    return process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  }

  return process.env.OPENAI_API_KEY;
}

function applyProviderDefaults(ai: NormalizedConfig["ai"]): void {
  if (ai.provider === "gemini") {
    if (!ai.model || ai.model === OPENAI_AI_DEFAULTS.model) {
      ai.model = GEMINI_AI_DEFAULTS.model;
    }
    if (!ai.baseUrl || ai.baseUrl === OPENAI_AI_DEFAULTS.baseUrl) {
      ai.baseUrl = GEMINI_AI_DEFAULTS.baseUrl;
    }
  } else {
    if (!ai.model || ai.model === GEMINI_AI_DEFAULTS.model) {
      ai.model = OPENAI_AI_DEFAULTS.model;
    }
    if (!ai.baseUrl || ai.baseUrl === GEMINI_AI_DEFAULTS.baseUrl) {
      ai.baseUrl = OPENAI_AI_DEFAULTS.baseUrl;
    }
  }

  if (!ai.promptTemplate) {
    ai.promptTemplate = DEFAULT_PROMPT_TEMPLATE;
  }

  if (!ai.timeoutMs || ai.timeoutMs <= 0) {
    ai.timeoutMs =
      ai.provider === "gemini"
        ? GEMINI_AI_DEFAULTS.timeoutMs
        : OPENAI_AI_DEFAULTS.timeoutMs;
  }
}

function buildGeminiEndpoint(baseUrl: string, model: string, apiKey: string): string {
  const cleanBaseUrl = baseUrl.replace(/\/+$/, "");
  const encodedModel = encodeURIComponent(model);
  const encodedApiKey = encodeURIComponent(apiKey);

  return `${cleanBaseUrl}/models/${encodedModel}:generateContent?key=${encodedApiKey}`;
}

function createTypeChecker(
  filePath: string,
  sourceCode: string,
  scriptKind: ts.ScriptKind,
  sourceFile: ts.SourceFile
): ts.TypeChecker | undefined {
  const virtualPath = resolveVirtualPath(filePath, scriptKind);
  const options: ts.CompilerOptions = {
    target: ts.ScriptTarget.ESNext,
    allowJs: true,
    checkJs: false,
    jsx: ts.JsxEmit.Preserve,
    skipLibCheck: true,
  };

  const defaultHost = ts.createCompilerHost(options, true);
  const normalizedVirtualPath = path.resolve(virtualPath);

  const host: ts.CompilerHost = {
    ...defaultHost,
    getSourceFile: (targetFileName, languageVersion, onError, shouldCreateNewSourceFile) => {
      if (path.resolve(targetFileName) === normalizedVirtualPath) {
        return sourceFile;
      }
      return defaultHost.getSourceFile(
        targetFileName,
        languageVersion,
        onError,
        shouldCreateNewSourceFile
      );
    },
    readFile: (targetFileName) => {
      if (path.resolve(targetFileName) === normalizedVirtualPath) {
        return sourceCode;
      }
      return defaultHost.readFile(targetFileName);
    },
    fileExists: (targetFileName) => {
      if (path.resolve(targetFileName) === normalizedVirtualPath) {
        return true;
      }
      return defaultHost.fileExists(targetFileName);
    },
  };

  try {
    const program = ts.createProgram([normalizedVirtualPath], options, host);
    return program.getTypeChecker();
  } catch {
    return undefined;
  }
}

function resolveVirtualPath(filePath: string, scriptKind: ts.ScriptKind): string {
  const ext = path.extname(filePath);
  if (ext && ext !== ".vue") {
    return filePath;
  }

  const suffixByKind: Record<number, string> = {
    [ts.ScriptKind.TS]: ".ts",
    [ts.ScriptKind.TSX]: ".tsx",
    [ts.ScriptKind.JS]: ".js",
    [ts.ScriptKind.JSX]: ".jsx",
  };

  const suffix = suffixByKind[scriptKind] || ".js";
  return `${filePath}${suffix}`;
}
