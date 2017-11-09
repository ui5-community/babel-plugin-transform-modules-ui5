
import * as t from 'babel-types'
import { buildAssign } from './templates'
import { findPropertiesOfNode, getIdName } from './ast'

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
 * It does this recurively in the case of those method calls.
 *
 * If there are any named exports left, they get returned, so the main plugin can check the opts
 * and decide if an error should be thrown.
 */
export function collapseNamedExports(programNode, defaultExportDeclaration, namedExports, opts) {
  namedExports = [...namedExports]
  namedExports = filterOutExportsWhichAlreadyMatchPropsOnDefault(programNode, defaultExportDeclaration, namedExports)
  if (!namedExports.length) {
    return []
  }
  else if (opts.noExportExtend) {
    return namedExports
  }
  else {
    return extendDefaultExportWithNamedExports(programNode, defaultExportDeclaration, namedExports)
  }
}

export function extendDefaultExportWithNamedExports(programNode, defaultExportDeclaration, namedExports) {
  namedExports = [...namedExports] // Shallow clone for safe splicing
  const variableName = defaultExportDeclaration.name || getIdName(defaultExportDeclaration)
  if (!variableName) { // Something anonymous
    return namedExports
  }
  else if (namedExports.some(exp => exp.conflict)) {
    return namedExports.conflicts.filter(exp => exp.conflict)
  }

  const id = t.isIdentifier(defaultExportDeclaration) ? defaultExportDeclaration : t.identifier(variableName)

  for (const namedExport of namedExports) {
    programNode.body.push(
      buildAssign({
        OBJECT: id,
        NAME: namedExport.key,
        VALUE: namedExport.value
      })
    )
  }
  return []
}


function filterOutExportsWhichAlreadyMatchPropsOnDefault(programNode, defaultExportDeclaration, namedExports) {
  namedExports = [...namedExports] // Shallow clone for safe splicing
  const defaultObjectProperties = findPropertiesOfNode(programNode, defaultExportDeclaration)

  // Loop through the default object's props and see if it already has a matching definition of the named exports.
  // If the definition matches, we can ignore the named export. If the definition does not match, mark it as a conflict.
  if (defaultObjectProperties) {
    for (const { key, value } of defaultObjectProperties) {
      if (t.isIdentifier(value)) {
        //let matchingNamedExportIndex = -1
        const matchingNamedExportIndex = namedExports.findIndex(namedExport => namedExport.key.name === key.name)
        const matchingNamedExport = namedExports[matchingNamedExportIndex]
        if (matchingNamedExport) {
          if (value.name === matchingNamedExport.value.name) {
            // Safe to ignore
            namedExports.splice(matchingNamedExportIndex, 1)
          }
          else {
            namedExports.conflict = true
          }
        }
      }
    }
  }

  return namedExports
}
