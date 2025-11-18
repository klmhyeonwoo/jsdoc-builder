import * as ts from "typescript";
import * as fs from "fs";
import * as path from "path";
import { AIService, AIConfig } from "./ai-service";

export interface GenerateJSDocOptions {
  aiEnabled?: boolean;
  apiKey?: string;
  model?: string;
}

/**
 * Parses a TypeScript, JavaScript, JSX, TSX, or Vue file and adds JSDoc comments to functions.
 * Skips functions that already have JSDoc comments.
 * @param filePath - The path of the file to process.
 * @param options - Options for AI-powered generation
 */
export async function generateJSDoc(
  filePath: string,
  options: GenerateJSDocOptions = {}
): Promise<void> {
  const aiConfig: AIConfig = {
    enabled: options.aiEnabled || false,
    apiKey: options.apiKey,
    model: options.model,
  };

  const aiService = new AIService(aiConfig);

  if (aiService.isEnabled()) {
    console.log(
      `AI-powered description generation enabled using model: ${
        options.model || "gpt-3.5-turbo"
      }`
    );
  }

  const ext = path.extname(filePath).toLowerCase();
  let sourceCode = fs.readFileSync(filePath, "utf-8");
  let isVueFile = false;
  let vueTemplate = "";
  let vueScriptContent = "";
  let vueStyle = "";
  let scriptStartPos = 0;

  // Handle Vue SFC (Single File Component)
  if (ext === ".vue") {
    isVueFile = true;
    const scriptMatch = sourceCode.match(/<script[^>]*>([\s\S]*?)<\/script\s*>/i);
    const templateMatch = sourceCode.match(/<template[^>]*>([\s\S]*?)<\/template\s*>/i);
    const styleMatch = sourceCode.match(/<style[^>]*>([\s\S]*?)<\/style\s*>/i);

    if (scriptMatch) {
      vueScriptContent = scriptMatch[1];
      scriptStartPos = scriptMatch.index! + scriptMatch[0].indexOf(scriptMatch[1]);
    }
    if (templateMatch) {
      vueTemplate = templateMatch[0];
    }
    if (styleMatch) {
      vueStyle = styleMatch[0];
    }

    sourceCode = vueScriptContent || "";
  }

  // Determine the appropriate ScriptKind based on file extension
  let scriptKind = ts.ScriptKind.TS;
  if (ext === ".js" || ext === ".mjs" || ext === ".cjs") {
    scriptKind = ts.ScriptKind.JS;
  } else if (ext === ".jsx") {
    scriptKind = ts.ScriptKind.JSX;
  } else if (ext === ".tsx") {
    scriptKind = ts.ScriptKind.TSX;
  } else if (ext === ".vue") {
    // For Vue files, treat the script section as JS
    scriptKind = ts.ScriptKind.JS;
  }

  const sourceFile = ts.createSourceFile(
    filePath,
    sourceCode,
    ts.ScriptTarget.Latest,
    true,
    scriptKind
  );

  // Collect all positions and JSDoc comments to insert
  const insertions: { pos: number; comment: string }[] = [];

  async function processNodes(node: ts.Node): Promise<void> {
    if (ts.isFunctionDeclaration(node) && node.name && !hasJSDoc(node)) {
      const functionCode = node.getText(sourceFile);
      const jsDoc = await createJSDoc(
        node.name.text,
        node.parameters,
        node.type,
        functionCode,
        aiService
      );

      // Get the actual start position (excluding leading trivia)
      const pos = node.getStart(sourceFile);
      insertions.push({ pos, comment: jsDoc.fullComment });
    }

    if (
      ts.isVariableDeclaration(node) &&
      node.initializer &&
      ts.isArrowFunction(node.initializer) &&
      !hasJSDoc(node.parent.parent)
    ) {
      const functionCode = node.initializer.getText(sourceFile);
      const jsDoc = await createJSDoc(
        node.name.getText(),
        node.initializer.parameters,
        node.initializer.type,
        functionCode,
        aiService
      );

      // Get the actual start position of the variable statement
      const pos = node.parent.parent.getStart(sourceFile);
      insertions.push({ pos, comment: jsDoc.fullComment });
    }

    // Recursively process children
    const children = node.getChildren(sourceFile);
    for (const child of children) {
      await processNodes(child);
    }
  }

  await processNodes(sourceFile);

  // Sort insertions by position in reverse order (so we can insert without affecting positions)
  insertions.sort((a, b) => b.pos - a.pos);

  let updatedCode = sourceCode;
  for (const insertion of insertions) {
    updatedCode =
      updatedCode.substring(0, insertion.pos) +
      insertion.comment +
      updatedCode.substring(insertion.pos);
  }

  // For Vue files, reconstruct the SFC structure
  if (isVueFile) {
    const originalFileContent = fs.readFileSync(filePath, "utf-8");
    const scriptMatch = originalFileContent.match(/<script[^>]*>([\s\S]*?)<\/script\s*>/i);
    
    if (scriptMatch) {
      const scriptTag = scriptMatch[0];
      const scriptOpenTag = scriptTag.substring(0, scriptTag.indexOf(scriptMatch[1]));
      const scriptCloseTag = "</script>";
      
      // Reconstruct the Vue file
      const parts = [];
      if (vueTemplate) {
        parts.push(vueTemplate);
      }
      parts.push(`${scriptOpenTag}${updatedCode}${scriptCloseTag}`);
      if (vueStyle) {
        parts.push(vueStyle);
      }
      
      updatedCode = parts.join("\n\n");
    }
  }

  fs.writeFileSync(filePath, updatedCode, "utf-8");
  console.log(`JSDoc comments have been added to ${filePath}`);
}

/**
 * Checks if a node already has JSDoc comments.
 * @param node - The TypeScript AST node to check.
 * @returns Whether the node has JSDoc.
 */
function hasJSDoc(node: ts.Node): boolean {
  return !!ts.getJSDocTags(node).length;
}

/**
 * Creates a JSDoc comment.
 * @param functionName - The name of the function.
 * @param parameters - The parameters of the function.
 * @param returnType - The return type of the function.
 * @param functionCode - The function code for AI context.
 * @param aiService - The AI service instance.
 * @returns A JSDoc comment as a string.
 */
async function createJSDoc(
  functionName: string,
  parameters: ts.NodeArray<ts.ParameterDeclaration>,
  returnType: ts.TypeNode | undefined,
  functionCode: string,
  aiService: AIService
): Promise<{ comment: string; fullComment: string }> {
  const paramTags = parameters.map((param) => ({
    tagName: "param",
    name: param.name.getText(),
    type: param.type ? param.type.getText() : "any",
  }));

  const returnTag = {
    tagName: "returns",
    type: returnType ? returnType.getText() : "void",
  };

  let description: string;

  if (aiService.isEnabled()) {
    description = await aiService.generateDescription(
      functionName,
      paramTags.map((p) => ({ name: p.name, type: p.type })),
      returnTag.type,
      functionCode
    );
  } else {
    description = `Press Your { Function ${functionName} } Description`;
  }

  const commentText = [
    ` * @description ${description}`,
    ...paramTags.map((tag) => ` * @param {${tag.type}} ${tag.name}`),
    ` * @returns {${returnTag.type}}`,
  ].join("\n");

  const fullComment = `/**\n${commentText}\n */\n`;

  return { comment: `*\n${commentText}\n`, fullComment };
}

