import { defineRule, eslintCompatPlugin } from "@oxlint/plugins";
import type { ESTree } from "@oxlint/plugins";

type Declaration = ESTree.TSTypeAliasDeclaration | ESTree.TSInterfaceDeclaration;

type InlineType = ESTree.TSTypeLiteral | ESTree.TSTupleType;

function atModuleLevel(node: Declaration): boolean {
  const parent = node.parent;

  const container =
    parent.type === "ExportNamedDeclaration" || parent.type === "ExportDefaultDeclaration"
      ? parent.parent
      : parent;

  return container.type === "Program" || container.type === "TSModuleBlock";
}

function insideDeclaration(node: InlineType): boolean {
  for (let parent: ESTree.Node | null = node.parent; parent; parent = parent.parent) {
    if (parent.type === "TSTypeAliasDeclaration" || parent.type === "TSInterfaceDeclaration") {
      return true;
    }
  }

  return false;
}

const noInlineTypes = defineRule({
  meta: {
    type: "suggestion",
    docs: {
      description: "Declare object and tuple types as named module-level types or interfaces",
    },
    schema: [],
    messages: {
      inline: "Inline {{kind}} type: declare it as a named module-level type or interface.",
      local: "Declare types at module level, not inside functions.",
    },
  },
  createOnce(context) {
    function checkInline(node: InlineType, kind: string): void {
      if (!insideDeclaration(node)) {
        context.report({ node, messageId: "inline", data: { kind } });
      }
    }

    function checkDeclaration(node: Declaration): void {
      if (!atModuleLevel(node)) {
        context.report({ node, messageId: "local" });
      }
    }

    return {
      TSTypeLiteral: (node) => checkInline(node, "object"),
      TSTupleType: (node) => checkInline(node, "tuple"),
      TSTypeAliasDeclaration: checkDeclaration,
      TSInterfaceDeclaration: checkDeclaration,
    };
  },
});

export default eslintCompatPlugin({
  meta: { name: "oxforge" },
  rules: { "no-inline-types": noInlineTypes },
});
