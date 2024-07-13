import { types as t, traverse } from "@babel/core";
import * as eh from "./exports";
import * as th from "../../utils/templates";
import * as ast from "../../utils/ast";

export function wrap(visitor, programNode, opts) {
  let {
    defaultExport,
    exportGlobal,
    firstImportMarked,
    imports,
    namedExports,
    ignoredImports,
    injectDynamicImportHelper,
  } = visitor;

  const needsWrap = !!(
    defaultExport ||
    imports.length ||
    namedExports.length ||
    injectDynamicImportHelper
  );

  if (!needsWrap) {
    // cleanup the program node if it's empty (just having empty imports)
    programNode.body = programNode.body.filter((node) => {
      if (t.isExportNamedDeclaration(node)) {
        return node.declaration != null;
      }
      return true;
    });
    return;
  }

  let { body } = programNode;

  // find the copyright comment from the original program body and remove it there
  // since it need to be put around the new program body (which is sap.ui.define)
  let copyright = body?.[0]?.leadingComments?.find((comment, idx, arr) => {
    if (comment.value.startsWith("!")) {
      arr.splice(idx, 1);
      return true;
    }
  });

  // in case of TypeScript transpiling taking place upfront, the copyright comment
  // is associcated with the program and not the program body, so we need to find it
  // and move it to the new program body (which is sap.ui.define)
  if (!copyright) {
    copyright = visitor.parent?.comments?.find((comment, idx, arr) => {
      if (comment.value.startsWith("!")) {
        arr.splice(idx, 1);
        return true;
      }
    });
  }

  let allExportHelperAdded = false;
  let extendAdded = false;

  opts.collapse = !opts.noExportCollapse;
  // opts.extend = !opts.noExportExtend

  // Before adding anything, see if the named exports can be collapsed into the default export.
  if (defaultExport && namedExports.length && opts.collapse) {
    let { filteredExports, conflictingExports, newDefaultExportIdentifier } =
      eh.collapseNamedExports(programNode, defaultExport, namedExports, opts);

    if (filteredExports.length && !opts.allowUnsafeMixedExports) {
      throw new Error(
        `Unsafe mixing of conflicting default and named exports. The following named exports are conflicting: (${ast
          .getPropNames(conflictingExports)
          .join(", ")}).`
      );
    } else {
      namedExports = filteredExports;
    }

    // The default export may have changed if the collapse logic needed to assign a prop when the default export was previously anonymous.
    if (newDefaultExportIdentifier) {
      extendAdded = true; // If an anonymous default export needed to be assigned to a a variable, it uses the exports name for convenience.
      defaultExport = newDefaultExportIdentifier;
    }
  }

  const preDefine = [...ignoredImports];
  // If the noWrapBeforeImport opt is set, split any code before the first import and afterwards into separate arrays.
  // This should be done before any interops or other vars are injected.
  if (opts.noWrapBeforeImport && firstImportMarked) {
    let reachedFirstImport = false;
    const fullBody = body;
    const newBody = [];

    for (const item of fullBody) {
      if (reachedFirstImport) {
        newBody.push(item);
      } else {
        preDefine.push(item);
      }
      if (item.lastBeforeWrapping) {
        reachedFirstImport = true;
      }
    }
    if (
      !opts.neverUseStrict &&
      preDefine.length &&
      !hasUseStrict(programNode)
    ) {
      programNode.directives = [
        t.directive(t.directiveLiteral("use strict")),
        ...(programNode.directives || []),
      ];
    }
    body = newBody;
  }

  if (injectDynamicImportHelper) {
    // import() to sap.ui.require() w/ promise and interop
    body.unshift(th.buildDynamicImportHelper());
  }

  if (!namedExports.length && defaultExport) {
    // If there's no named exports, return the default export
    body.push(t.returnStatement(defaultExport));
  } else if (namedExports.length) {
    if (!extendAdded) {
      body.push(th.buildDeclareExports()); // i.e. const __exports = {__esModule: true};
    }

    for (const namedExport of namedExports) {
      if (namedExport.all) {
        if (!allExportHelperAdded) {
          body.push(th.buildAllExportHelper());
          allExportHelperAdded = true;
        }
        body.push(
          th.buildAllExport({
            LOCAL: namedExport.value,
          })
        );
      } else {
        body.push(th.buildNamedExport(namedExport));
      }
    }

    if (defaultExport) {
      body.push(
        th.buildNamedExport({
          key: t.identifier("default"),
          value: defaultExport,
        })
      );
    }
    body.push(th.buildReturnExports());
  }

  if (imports.some((imp) => imp.interop)) {
    body.unshift(th.buildDefaultImportInterop());
  }

  // should we use sap.ui.require instead of sap.ui.define?
  let useSapUiRequire = hasUseSapUiRequire(visitor.parent.comments, body, true);

  // generate the sap.ui.define or sap.ui.require
  const defineOrRequire = generateDefineOrRequire(
    body,
    imports,
    exportGlobal || opts.exportAllGlobal,
    useSapUiRequire
  );

  // add the "use strict" directive if not on program node
  if (!opts.neverUseStrict && !hasUseStrict(programNode)) {
    const defineOrRequireFnBody = defineOrRequire.expression.arguments[1].body;
    defineOrRequireFnBody.directives = [
      t.directive(t.directiveLiteral("use strict")),
      ...(defineOrRequireFnBody.directives || []),
    ];
  }

  programNode.body = [...preDefine, defineOrRequire];

  // if a copyright comment is present we append it to the new program node
  if (copyright && visitor.parent) {
    visitor.parent.leadingComments = visitor.parent.leadingComments || [];
    visitor.parent.leadingComments.unshift(copyright);
  }
}

function hasUseStrict(node) {
  return (node.directives || []).some(
    (directive) => directive.value.value === "use strict"
  );
}

function hasUseSapUiRequire(comments, body, remove) {
  // detect the @sapUiRequire comment
  return comments.some((comment) => {
    let found = false;
    // check for existing comment block
    if (comment.type === "CommentBlock") {
      found = comment.value.trim() === "@sapUiRequire";
    }
    // remove the comment (if it is somewhere in the body)
    if (found && remove) {
      body?.forEach((node) => {
        traverse(node, {
          enter(path) {
            ["leadingComments", "trailingComments", "innerComments"].forEach(
              (key) => {
                path.node[key] = path.node[key]?.filter((c) => c !== comment);
              }
            );
          },
          noScope: true,
        });
      });
    }
    return found;
  });
}

function generateDefineOrRequire(body, imports, exportGlobal, useRequire) {
  const defineOpts = {
    SOURCES: t.arrayExpression(imports.map((i) => t.stringLiteral(i.src))),
    PARAMS: imports.map((i) => t.identifier(i.tmpName)),
    BODY: body,
  };
  return useRequire
    ? th.buildRequire(defineOpts)
    : exportGlobal
      ? th.buildDefineGlobal(defineOpts)
      : th.buildDefine(defineOpts);
}
