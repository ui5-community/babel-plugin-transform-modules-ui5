
import * as t from 'babel-types'
import flatten from 'array-flatten'
import { isObjectAssignOrExtendsExpression } from './ast'
import { buildAssign } from './templates'

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
  namedExports = filterOutExportsWhichMatchPropsOnDefault(programNode, defaultExportDeclaration, namedExports)
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

  if (!defaultExportDeclaration.name) { // Something anonymous
    //TODO see if we can give it a name
    return namedExports
  }
  else if (namedExports.some(exp => exp.conflict)) {
    return namedExports.conflicts.filter(exp => exp.conflict)
  }

  const id = t.isIdentifier(defaultExportDeclaration) ? defaultExportDeclaration : t.identifier(defaultExportDeclaration.name)

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


export function filterOutExportsWhichMatchPropsOnDefault(programNode, defaultExportDeclaration, namedExports) {
  namedExports = [...namedExports] // Shallow clone for safe splicing
  const defaultObjectInfo = findPropertiesOfDeclaration(programNode, defaultExportDeclaration)

  // Loop through the default object's props and see if it already has a matching definition of the named exports.
  // If the definition matches, we can ignore the named export. If the definition does not match, mark it as a conflict.
  if (defaultObjectInfo.properties) {
    for (const { key, value } of defaultObjectInfo.properties) {
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

export function findPropertiesOfDeclaration(programNode, declaration) {
  const { type } = declaration
  if (t.isFunctionDeclaration(declaration) || t.isArrowFunctionExpression(declaration)) {
    return { type }
  }
  else if (t.isObjectExpression(declaration)) {
    return {
      type, properties: declaration.properties
    }
  }
  else if (t.isClassDeclaration(declaration)) {
    return {
      type, properties: [
        ...getStaticThingsOfClassDeclaration(declaration),
        ...getOtherPropertyOfIdentifier(programNode, declaration.id.name)
      ]
    }
  }
  else if (t.isIdentifier(declaration)) {
    return {
      type, properties: getOtherPropertyOfIdentifier(programNode, declaration.name)
    }
  }
  else if (isObjectAssignOrExtendsExpression(declaration)) {
    return {
      type, properties: getPropertiesOfObjectAssignOrExtendHelper(declaration, programNode)
    }
  }
  // console.log(require('util').inspect(declaration, { depth: null }));
  return { type }
}

function getStaticThingsOfClassDeclaration(classDeclaration) {
  return classDeclaration.body.body
    .filter(item => item.static)
}

/**
 * Traverse the top level of the program body looking for either:
 *  - ObjectExpression assignments to the object variable.
 *  - Property assignments directly to our object (but not to nested properties).
 *
 *  @return Array<{key, value}>
 */
function getOtherPropertyOfIdentifier(programNode, idName) {
  return flatten(
    programNode.body
      .map(node => {
        if (t.isExpressionStatement(node)) { // ID = value | ID.key = value | ID.key.nested = value
          const { left, right } = node.expression
          if (t.isAssignmentExpression(node.expression)) {
            if (t.isIdentifier(left) && left.name === idName) { // ID = value
              if (t.isObjectExpression(right)) { // ID = {}
                return right.properties // Array<ObjectProperty>
              }
            }
            else {
              const { object, property: key } = left
              if (t.isIdentifier(object) && object.name === idName) { // ID.key = value
                return { key, value: right } // ObjectProperty-like (key, value)
              }
            }
          }
        }
        else if (t.isVariableDeclaration(node)) {
          // console.log(require('util').inspect(node, { depth: 4 }));
          return node.declarations
            .filter(declaration => declaration.id.name === idName)
            .map(declaration => declaration.init)
            .filter(init => init)
            .filter(init => (
              t.isObjectExpression(init) || isObjectAssignOrExtendsExpression(init))
            )
            .map(init => (
              t.isObjectExpression(init) ?
                init.properties :
                getPropertiesOfObjectAssignOrExtendHelper(init, programNode)
            ))
        }
      })
      .filter(item => item)
  )
}

function getPropertiesOfObjectAssignOrExtendHelper(node, programNode) {
  // Object.assign(...). Check all the args and recursively try to get props of identifiers (although they may be imported)
  return flatten(
    node.arguments.map(arg => {
      if (t.isObjectExpression(arg)) {
        return arg.properties
      }
      else if (t.isIdentifier(arg)) {
        // recurse. although props will be empty if arg is an imported object
        return getOtherPropertyOfIdentifier(programNode, arg.name)
      }
    })
  )
}

// function getPropsFromObjectAssign()

export function getPropNames(props) {
  return props.map(prop => prop.key.name)
}
