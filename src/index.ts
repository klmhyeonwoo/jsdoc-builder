import * as ts from "typescript";
import * as fs from "fs";

/**
 * Parses a TypeScript or JavaScript file and adds JSDoc comments to functions.
 * @param filePath - The path of the file to process.
 */
export function generateJSDoc(filePath: string): void {
  const sourceCode = fs.readFileSync(filePath, "utf-8");
  const sourceFile = ts.createSourceFile(
    filePath,
    sourceCode,
    ts.ScriptTarget.Latest,
    true
  );

  const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });

  // Visit function that processes each node
  function visit(node: ts.Node, context: ts.TransformationContext): ts.Node {
    if (ts.isFunctionDeclaration(node) && node.name) {
      const jsDoc = createJSDoc(node.name.text, node.parameters, node.type);
      ts.addSyntheticLeadingComment(
        node,
        ts.SyntaxKind.MultiLineCommentTrivia,
        jsDoc.comment,
        true
      );
      return node;
    }

    // Check for arrow functions assigned to a constant
    if (
      ts.isVariableDeclaration(node) &&
      node.initializer &&
      ts.isArrowFunction(node.initializer)
    ) {
      const jsDoc = createJSDoc(
        node.name.getText(),
        node.initializer.parameters,
        node.initializer.type
      );

      // Add JSDoc to the entire variable statement for clarity
      const parent = node.parent;
      if (
        ts.isVariableDeclarationList(parent) &&
        parent.declarations.length === 1
      ) {
        ts.addSyntheticLeadingComment(
          parent.parent,
          ts.SyntaxKind.MultiLineCommentTrivia,
          jsDoc.comment,
          true
        );
      }
      return node;
    }

    return ts.visitEachChild(node, (child) => visit(child, context), context); // Pass context to visit
  }

  // Create the transformer
  const transformer: ts.TransformerFactory<ts.SourceFile> = (context) => {
    return (sourceFile) => {
      return ts.visitNode(sourceFile, (node) =>
        visit(node, context)
      ) as ts.SourceFile; // Pass context to visit
    };
  };

  // Apply the transformer
  const result = ts.transform(sourceFile, [transformer]);
  const transformedSourceFile = result.transformed[0] as ts.SourceFile;
  const updatedCode = printer.printFile(transformedSourceFile);

  fs.writeFileSync(filePath, updatedCode, "utf-8");
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
