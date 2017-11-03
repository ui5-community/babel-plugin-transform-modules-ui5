
import * as t from 'babel-types'
import flatten from 'array-flatten'
import { isObjectAssignOrExtendsExpression } from './ast-helpers'
import { buildAssign } from './templates'

export function collapseNamedExports(programNode, defaultExportDeclaration, namedExports, opts) {
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
        NAME: namedExport.EXPORTED,
        VALUE: namedExport.LOCAL
      })
    )
  }
  return []
}

export function filterOutExportsWhichMatchPropsOnDefault(programNode, defaultExportDeclaration, namedExports) {
  namedExports = [...namedExports] // Shallow clone for safe splicing
  const defaultObjectInfo = findPropertiesOfDeclaration(programNode, defaultExportDeclaration)

  // console.log(require('util').inspect(defaultObjectInfo, { depth: null }));

  // Loop through the default object's props and see if it already has a matching definition of the named exports.
  // If the definition matches, we can ignore the named export. If the definition does not match, mark it as a conflict.
  if (defaultObjectInfo.properties) {
    for (const { key, value } of defaultObjectInfo.properties) {
      if (t.isIdentifier(value)) {
        //let matchingNamedExportIndex = -1
        const matchingNamedExportIndex = namedExports.findIndex(namedExport => namedExport.EXPORTED.name === key.name)
        const matchingNamedExport = namedExports[matchingNamedExportIndex]
        if (matchingNamedExport) {
          if (value.name === matchingNamedExport.LOCAL.name) {
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
  if (type === 'FunctionDeclaration' || type === 'ArrowFunctionExpression') {
    return { type }
  }
  else if (t.isObjectExpression(declaration)) {
    return {
      type, properties: declaration.properties
    }
  }
  else if (type === 'ClassDeclaration') {
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
        if (node.type === 'ExpressionStatement') { // ID = value | ID.key = value | ID.key.nested = value
          const { left, right, type } = node.expression
          if (type === 'AssignmentExpression') {
            if (left.type === 'Identifier' && left.name === idName) { // ID = value
              if (right.type === 'ObjectExpression') { // ID = {}
                return right.properties // Array<ObjectProperty>
              }
            }
            else {
              const { object, property: key } = left
              if (object.type === 'Identifier' && object.name === idName) { // ID.key = value
                return { key, value: right } // ObjectProperty-like (key, value)
              }
            }
          }
        }
        else if (node.type === 'VariableDeclaration') {
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



export function getPropNames(namedExports) {
  return namedExports
    .map(namedExport => namedExport.EXPORTED.name)
}
