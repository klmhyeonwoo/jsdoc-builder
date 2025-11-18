import * as ts from "typescript";
import * as fs from "fs";
import * as path from "path";

/**
 * Parses a TypeScript, JavaScript, JSX, TSX, or Vue file and adds JSDoc comments to functions.
 * Skips functions that already have JSDoc comments.
 * @param filePath - The path of the file to process.
 */
export function generateJSDoc(filePath: string): void {
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
    const scriptMatch = sourceCode.match(/<script[^>]*>([\s\S]*?)<\/script>/);
    const templateMatch = sourceCode.match(/<template>([\s\S]*?)<\/template>/);
    const styleMatch = sourceCode.match(/<style[^>]*>([\s\S]*?)<\/style>/);

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

  const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });

  function visit(node: ts.Node, context: ts.TransformationContext): ts.Node {
    if (ts.isFunctionDeclaration(node) && node.name && !hasJSDoc(node)) {
      const jsDoc = createJSDoc(node.name.text, node.parameters, node.type);
      ts.addSyntheticLeadingComment(
        node,
        ts.SyntaxKind.MultiLineCommentTrivia,
        jsDoc.comment,
        true
      );
      return node;
    }

    if (
      ts.isVariableDeclaration(node) &&
      node.initializer &&
      ts.isArrowFunction(node.initializer) &&
      !hasJSDoc(node.parent.parent) // VariableStatement에 JSDoc이 있는지 확인
    ) {
      const jsDoc = createJSDoc(
        node.name.getText(),
        node.initializer.parameters,
        node.initializer.type
      );

      ts.addSyntheticLeadingComment(
        node.parent.parent,
        ts.SyntaxKind.MultiLineCommentTrivia,
        jsDoc.comment,
        true
      );
      return node;
    }

    return ts.visitEachChild(node, (child) => visit(child, context), context);
  }

  const transformer: ts.TransformerFactory<ts.SourceFile> = (context) => {
    return (sourceFile) => {
      return ts.visitNode(sourceFile, (node) =>
        visit(node, context)
      ) as ts.SourceFile;
    };
  };

  const result = ts.transform(sourceFile, [transformer]);
  const transformedSourceFile = result.transformed[0] as ts.SourceFile;
  let updatedCode = printer.printFile(transformedSourceFile);

  // For Vue files, reconstruct the SFC structure
  if (isVueFile) {
    const originalFileContent = fs.readFileSync(filePath, "utf-8");
    const scriptMatch = originalFileContent.match(/<script[^>]*>([\s\S]*?)<\/script>/);
    
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
 * @returns A JSDoc comment as a string.
 */
function createJSDoc(
  functionName: string,
  parameters: ts.NodeArray<ts.ParameterDeclaration>,
  returnType?: ts.TypeNode
): { comment: string } {
  const paramTags = parameters.map((param) => ({
    tagName: "param",
    name: param.name.getText(),
    type: param.type ? param.type.getText() : "any",
  }));

  const returnTag = {
    tagName: "returns",
    type: returnType ? returnType.getText() : "void",
  };

  const commentText = [
    `* @description Press Your { Function ${functionName} } Description`,
    ...paramTags.map((tag) => `* @param {${tag.type}} ${tag.name}`),
    `* @returns {${returnTag.type}}`,
  ].join("\n");

  return { comment: `*\n${commentText}\n` };
}
