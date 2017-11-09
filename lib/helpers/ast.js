
import * as t from 'babel-types'
import flatten from 'array-flatten'

// console.log("T:", require('util').inspect(t, { depth: null }));


// export function isIdentifier(node) {
//   return node && node.type === 'Identifier'
// }

// export function isObjectLiteral(node) {
//   return node && node.type === 'ObjectExpression'
// }

export function isObjectAssignOrExtendsExpression(node) {
  return isObjectAssignExpression(node) || isExtendsHelperExpression(node)
}

export function isObjectAssignExpression(node) {
  if (!t.isCallExpression(node)) return false
  const callee = node && node.callee
  return !!(callee.object && callee.property && callee.object.name === 'Object' && (callee.property.name === 'assign'))
}

// export function isCallExpression(node) {
//   return node && node.type === 'CallExpression'
// }

export function isExtendsHelperExpression(node) {
  if (!t.isCallExpression(node)) return false
  const callee = node && node.callee
  return isIdentifierNamed(callee, '_extends')
}

export function isIdentifierNamed(node, name) {
  return t.isIdentifier(node, { name: name })
}

// This doesn't exist on babel-types
export function isCommentBlock(node) {
  return node && node.type === 'CommentBlock'
}

export function getIdName(node) {
  return node.id && node.id.name
}

export function findPropertiesOfNode(blockScopeNode, declaration) {
  if (t.isFunctionDeclaration(declaration) || t.isArrowFunctionExpression(declaration)) {
    return null
  }
  else if (t.isObjectExpression(declaration)) {
    return declaration.properties
  }
  else if (t.isClass(declaration)) {
    return [
      ...getInternalStaticThingsOfClass(declaration),
      ...getOtherPropertiesOfIdentifier(blockScopeNode, declaration.id.name)
    ]
  }
  else if (t.isIdentifier(declaration)) {
    return getOtherPropertiesOfIdentifier(blockScopeNode, declaration.name)
  }
  else if (isObjectAssignOrExtendsExpression(declaration)) {
    return getPropertiesOfObjectAssignOrExtendHelper(declaration, blockScopeNode)
  }
  return null
}

export function getInternalStaticThingsOfClass(classNode) {
  return classNode.body.body.filter(item => item.static)
}

/**
 * Traverse the top-level of the scope (program or function body) looking for either:
 *  - ObjectExpression assignments to the object variable.
 *  - Property assignments directly to our object (but not to nested properties).
 *
 *  @return Array<{key, value}>
 */
export function getOtherPropertiesOfIdentifier(blockScopeNode, idName) {
  return flatten(
    blockScopeNode.body
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
                getPropertiesOfObjectAssignOrExtendHelper(init, blockScopeNode)
            ))
        }
      })
      .filter(item => item)
  )
}

export function getPropertiesOfObjectAssignOrExtendHelper(node, blockScopeNode) {
  // Object.assign(...). Check all the args and recursively try to get props of identifiers (although they may be imported)
  return flatten(
    node.arguments.map(arg => {
      if (t.isObjectExpression(arg)) {
        return arg.properties
      }
      else if (t.isIdentifier(arg)) {
        // recurse. although props will be empty if arg is an imported object
        return getOtherPropertiesOfIdentifier(blockScopeNode, arg.name)
      }
    })
  )
}

// function getPropsFromObjectAssign()

export function getPropNames(props) {
  return props.map(prop => prop.key.name)
}

export function groupPropertiesByName(properties) {
  return properties && properties.reduce((accumulator, property) => {
    accumulator[property.key.name] = property.value
    return accumulator
  }, {})
}
