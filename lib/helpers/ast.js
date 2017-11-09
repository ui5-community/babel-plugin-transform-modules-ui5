
import * as t from 'babel-types'

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
  return t.isIdentifier(node) && (node.name === name)
}

// This doesn't exist on babel-types
export function isCommentBlock(node) {
  return node && node.type === 'CommentBlock'
}

export function getIdName(node) {
  return node.id && node.id.name
}
