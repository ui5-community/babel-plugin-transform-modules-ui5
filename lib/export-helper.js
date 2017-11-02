
import flatten from 'array-flatten'

export function findPropertiesOfDefaultExport(programNode, exportDeclaration) {
  const { type } = exportDeclaration
  const result = { type }
  if (type === 'FunctionDeclaration' || type === 'ArrowFunctionExpression') {
    return result
  }
  else if (type === 'ObjectExpression') {
    // Direct ObjectExpression (object literal) being exported. No need to look elsewhere in the program.
    return {
      type, properties: exportDeclaration.properties
    }
  }
  else if (type === 'ClassDeclaration') {
    const idName = exportDeclaration.id.name
    const inPlaceStatics = getStaticThingsOfClassDeclaration(exportDeclaration)
    const extraProperties = getOtherPropertyOfIdentifier(programNode, idName)
    return {
      type, properties: [
        ...inPlaceStatics,
        ...extraProperties
      ]
    }
  }
  else if (type === 'Identifier') {
    // TODO Find the declaration in the program and also all editing of it.
    const idName = exportDeclaration.name
    const extraProperties = getOtherPropertyOfIdentifier(programNode, idName)
    return {
      type, properties: extraProperties
    }
  }
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
  return programNode.body
    .map(node => {
      if (node.type === 'ExpressionStatement') { // ID = value | ID.key = value | ID.key.nested = value
        const { left, right } = node.expression
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
      else if (node.type === 'VariableDeclaration') {
        return node.declarations
          .filter(declaration => declaration.id.name === idName)
          .map(declaration => declaration.init)
          .filter(init => init && init.type === 'ObjectExpression')
          .map(init => init.properties)
      }
    })
}

function getPropertiesAndMethodsOfObjectExpression(objectExpression) {
  return objectExpression.properties
}
