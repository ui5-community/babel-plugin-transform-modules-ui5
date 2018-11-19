"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.wrap = wrap;

var _core = require("@babel/core");

var th = _interopRequireWildcard(require("./templates"));

var eh = _interopRequireWildcard(require("./exports"));

var ast = _interopRequireWildcard(require("./ast"));

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = Object.defineProperty && Object.getOwnPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : {}; if (desc.get || desc.set) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } } newObj.default = obj; return newObj; } }

function wrap(visitor, programNode, opts) {
  let {
    defaultExport,
    exportGlobal,
    firstImport,
    injectDynamicImportHelper,
    imports,
    namedExports
  } = visitor;
  let {
    body
  } = programNode;
  let allExportHelperAdded = false;
  let extendAdded = false;
  opts.collapse = !opts.noExportCollapse; // opts.extend = !opts.noExportExtend
  // Before adding anything, see if the named exports can be collapsed into the default export.

  if (defaultExport && namedExports.length && opts.collapse) {
    let {
      filteredExports,
      conflictingExports,
      newDefaultExportIdentifier
    } = eh.collapseNamedExports(programNode, defaultExport, namedExports, opts);

    if (filteredExports.length && !opts.allowUnsafeMixedExports) {
      throw new Error(`Unsafe mixing of conflicting default and named exports. The following named exports are conflicting: (${ast.getPropNames(conflictingExports).join(", ")}).`);
    } else {
      namedExports = filteredExports;
    } // The default export may have changed if the collapse logic needed to assign a prop when the default export was previously anonymous.


    if (newDefaultExportIdentifier) {
      extendAdded = true; // If an anonymous default export needed to be assigned to a a variable, it uses the exports name for convenience.

      defaultExport = newDefaultExportIdentifier;
    }
  } // If the noWrapBeforeImport opt is set, split any code before the first define and afterwards into separate arrays.
  // This should be done before any interops or other vars are injected.


  const preDefine = [];

  if (opts.noWrapBeforeImport && firstImport) {
    let reachedFirstImport = false;
    const fullBody = body;
    const newBody = [];

    for (const item of fullBody) {
      if (item === firstImport) {
        reachedFirstImport = true;
      }

      if (reachedFirstImport) {
        newBody.push(item);
      } else {
        preDefine.push(item);
      }
    }

    if (preDefine.length && !hasUseStrict(programNode)) {
      programNode.directives = [_core.types.directive(_core.types.directiveLiteral("use strict")), ...(programNode.directives || [])];
    }

    body = newBody;
  }

  if (injectDynamicImportHelper) {
    // import() to sap.ui.require() w/ promise and interop
    body.unshift(th.buildDynamicImportHelper());
  }

  if (!namedExports.length && defaultExport) {
    // If there's no named exports, return the default export
    body.push(_core.types.returnStatement(defaultExport));
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

        body.push(th.buildAllExport({
          LOCAL: namedExport.value
        }));
      } else {
        body.push(th.buildNamedExport(namedExport));
      }
    }

    if (defaultExport) {
      body.push(th.buildNamedExport({
        key: _core.types.identifier("default"),
        value: defaultExport
      }));
    }

    body.push(th.buildReturnExports());
  }

  if (imports.some(imp => imp.interop)) {
    body.unshift(th.buildDefaultImportInterop());
  }

  programNode.body = [...preDefine, generateDefine(body, imports, exportGlobal || opts.exportAllGlobal)];
}

function hasUseStrict(node) {
  return (node.directives || []).some(directive => directive.value.value === "use strict");
}

function generateDefine(body, imports, exportGlobal) {
  const defineOpts = {
    SOURCES: _core.types.arrayExpression(imports.map(i => _core.types.stringLiteral(i.src))),
    PARAMS: imports.map(i => _core.types.identifier(i.tmpName)),
    BODY: body
  };
  return exportGlobal ? th.buildDefineGlobal(defineOpts) : th.buildDefine(defineOpts);
}