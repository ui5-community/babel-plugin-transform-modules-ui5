"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.collapseNamedExports = collapseNamedExports;
exports.getDefaultExportName = getDefaultExportName;

var _core = require("@babel/core");

var th = _interopRequireWildcard(require("./templates"));

var ast = _interopRequireWildcard(require("./ast"));

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = Object.defineProperty && Object.getOwnPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : {}; if (desc.get || desc.set) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } } newObj.default = obj; return newObj; } }

/**
 * Collapse named exports onto the default export so that the default export can be returned directly,
 * so that exports can be easily used by code that does not include an import interop.
 * This includes the following:
 *  - Ignore named exports that already exist on the default export and which reference the same identifer.
 *  - If possible, assign any remaining exports to the default export.
 *    - This cannot be done if there is a naming conflict.
 *
 * In order to determine what properties the default export already has, the plugin will scan the
 * top level of the program to find any assignments, including Object.assign() and _extend() calls.
 * It does this recursively in the case of those method calls.
 *
 * If there are any named exports left, they get returned, so the main plugin can check the opts
 * and decide if an error should be thrown.
 */
function collapseNamedExports(programNode, defaultExport, namedExports, opts) {
  namedExports = filterOutExportsWhichAlreadyMatchPropsOnDefault(programNode, defaultExport, namedExports);

  if (!namedExports.length || opts.noExportExtend) {
    return {
      filteredExports: namedExports,
      newDefaultExportIdentifier: null
    };
  }

  if (namedExports.some(exp => exp.conflict)) {
    return {
      filteredExports: namedExports,
      conflictingExports: namedExports.filter(exp => exp.conflict),
      newDefaultExportIdentifier: null
    };
  }

  let exportVariableName = getDefaultExportName(defaultExport);
  let newDefaultExportIdentifier = null;

  if (!exportVariableName) {
    // Something anonymous (literal, anon function, etc...)
    programNode.body.push(th.buildTempExport({
      VALUE: defaultExport
    }));
    newDefaultExportIdentifier = th.exportsIdentifier;
    exportVariableName = newDefaultExportIdentifier.name;
  }

  const id = _core.types.identifier(exportVariableName);

  for (const namedExport of namedExports) {
    programNode.body.push(th.buildAssign({
      OBJECT: id,
      NAME: namedExport.key,
      VALUE: namedExport.value
    }));
  }

  return {
    filteredExports: [],
    conflictingExports: [],
    newDefaultExportIdentifier: newDefaultExportIdentifier
  };
}

function getDefaultExportName(defaultExport) {
  return defaultExport.name || ast.getIdName(defaultExport);
}

function filterOutExportsWhichAlreadyMatchPropsOnDefault(programNode, defaultExport, namedExports) {
  namedExports = [...namedExports]; // Shallow clone for safe splicing

  const defaultObjectProperties = ast.findPropertiesOfNode(programNode, defaultExport); // Loop through the default object's props and see if it already has a matching definition of the named exports.
  // If the definition matches, we can ignore the named export. If the definition does not match, mark it as a conflict.

  if (defaultObjectProperties) {
    for (const defaultExportProperty of defaultObjectProperties) {
      if (!defaultExportProperty.key) {
        // i.e. SpreadProperty
        continue;
      }

      const matchingNamedExportIndex = namedExports.findIndex(namedExport => namedExport.key.name === defaultExportProperty.key.name); // get the index for splicing

      const matchingNamedExport = namedExports[matchingNamedExportIndex];

      if (matchingNamedExport && !matchingNamedExport.conflict) {
        if (areSame(defaultExportProperty, matchingNamedExport)) {
          namedExports.splice(matchingNamedExportIndex, 1);
        } else {
          matchingNamedExport.conflict = true;
        }
      }
    }
  }

  return namedExports;
}

function areSame(defaultExportProperty, matchingNamedExport) {
  const defaultExportValue = defaultExportProperty.value;
  const declaration = matchingNamedExport.declaration; // i.e. 'export const a = 1' or 'export let a = b'

  if (!defaultExportValue) {
    // i.e. object method
    return false; // always a conflict
  } else if (_core.types.isIdentifier(defaultExportValue)) {
    const valueName = defaultExportValue.name;

    if (valueName === matchingNamedExport.value.name) {
      // Same identifier reference. Safe to ignore
      return true;
    } else if (declaration && _core.types.isIdentifier(declaration.init) && declaration.init.name === valueName) {
      // i.e. 'export let a = b', and default value for a is 'b'.
      return true;
    }
  } else if (_core.types.isLiteral(defaultExportValue)) {
    // i.e. { a: 1 } or { a: '1' }
    // See if the original declaration for the matching export was for the same literal
    if (_core.types.isLiteral(declaration.init) && declaration.init.value === defaultExportValue.value) {
      // i.e. 'export const a = 1'
      // Same literal. Safe to ignore
      return true;
    }
  } // Either a conflicting value or no value at all (i.e. method)


  return false;
}