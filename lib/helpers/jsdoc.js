import * as t from 'babel-types'
import doctrine from 'doctrine'
import ignoreCase from 'ignore-case'
import { isCommentBlock } from './ast'

const classInfoValueTags = [
  'alias',
  'name',
  'namespace'
]

const classinfoBoolTags = [
  'nonUI5'
]

export function getJsDocClassInfo(node, parent) {
  if (node.leadingComments) {
    return (node.leadingComments
      .filter(isCommentBlock)
      .map(comment => {
        const docAST = doctrine.parse(comment.value, {
          unwrap: true
        })
        const tags = docAST.tags || []
        const info = {}
        for (const tagName of classInfoValueTags) {
          const value = getJsDocTagValue(tags, tagName)
          if (value) {
            info[tagName] = value
          }
        }
        for (const tagName of classinfoBoolTags) {
          const value = !!getJsDocTag(tags, 'nonui5')
          if (value) {
            info[tagName] = value
          }
        }
        return info
      })
      .filter(notEmpty)
      )[0]
  }
  // Else see if the JSDoc are on the return statement (i..e return class X extends SAPClass)
  else if (t.isClassExpression(node) && t.isReturnStatement(parent)) {
    return getJsDocClassInfo(parent)
  }
  else {
    return {}
  }
}

function getJsDocTagValue(tags, name) {
  const tag = getJsDocTag(tags, name)
  return tag && (tag.name || tag.description)
}

function getJsDocTag(tags, name) {
  return tags.find(t => ignoreCase.equals(name, t.title))
}

function notEmpty(obj) {
  return Object.values(obj).some(value => value)
}

export function hasJsdocGlobalExportFlag(node) {
  if (!node.leadingComments) {
    return false
  }
  return node.leadingComments
  .filter(isCommentBlock)
  .some(comment => {
    return doctrine.parse(comment.value, {
      unwrap: true,
      tags: ['global']
    })
    .tags.length > 0
  })
}
