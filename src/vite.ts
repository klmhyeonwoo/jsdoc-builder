import * as path from "path";
import { GenerateJSDocOptions, generateJSDocFromCode } from "./index";

type FilterPattern = string | RegExp;

export interface ViteLikeTransformResult {
  code: string;
  map: null;
}

export interface ViteLikePlugin {
  name: string;
  enforce?: "pre" | "post";
  apply?: "serve" | "build";
  transform?: (
    code: string,
    id: string
  ) => Promise<ViteLikeTransformResult | null> | ViteLikeTransformResult | null;
}

export interface JSDocBuilderVitePluginOptions extends GenerateJSDocOptions {
  include?: FilterPattern[];
  exclude?: FilterPattern[];
  extensions?: string[];
  apply?: "serve" | "build" | "both";
}

const DEFAULT_EXTENSIONS = [".js", ".jsx", ".ts", ".tsx", ".vue"];

export function jsdocBuilderVitePlugin(
  options: JSDocBuilderVitePluginOptions = {}
): ViteLikePlugin {
  const {
    include = [],
    exclude = [/node_modules/],
    extensions = DEFAULT_EXTENSIONS,
    apply = "both",
    ...generateOptions
  } = options;

  return {
    name: "jsdoc-builder",
    enforce: "pre",
    apply: apply === "both" ? undefined : apply,
    async transform(code: string, id: string) {
      const targetId = stripQuery(id);

      if (!shouldProcessFile(targetId, include, exclude, extensions)) {
        return null;
      }

      const nextCode = await generateJSDocFromCode(targetId, code, generateOptions);
      if (nextCode === code) {
        return null;
      }

      return {
        code: nextCode,
        map: null,
      };
    },
  };
}

function shouldProcessFile(
  id: string,
  include: FilterPattern[],
  exclude: FilterPattern[],
  extensions: string[]
): boolean {
  if (!id || id.startsWith("\0")) {
    return false;
  }

  const normalizedId = id.replace(/\\/g, "/");
  const fileExt = path.extname(normalizedId).toLowerCase();
  const normalizedExtensions = new Set(extensions.map((ext) => ext.toLowerCase()));

  if (!normalizedExtensions.has(fileExt)) {
    return false;
  }

  if (exclude.some((pattern) => matchesPattern(normalizedId, pattern))) {
    return false;
  }

  if (include.length === 0) {
    return true;
  }

  return include.some((pattern) => matchesPattern(normalizedId, pattern));
}

function matchesPattern(id: string, pattern: FilterPattern): boolean {
  if (typeof pattern === "string") {
    return id.includes(pattern);
  }

  return pattern.test(id);
}

function stripQuery(id: string): string {
  const queryIndex = id.indexOf("?");
  return queryIndex >= 0 ? id.slice(0, queryIndex) : id;
}
