import doctrine from 'doctrine'
import ignoreCase from 'ignore-case'

export function getJsDocTagValue(tags, name) {
  const tag = getJsDocTag(tags, name)
  return tag && (tag.name || tag.description)
}

export function getJsDocTag(tags, name) {
  return tags.find(t => ignoreCase.equals(name, t.title))
}

export function getJsDocClassInfo(node, parent) {
  if (node.leadingComments) {
    return (node.leadingComments
      .filter(comment => comment.type === 'CommentBlock')
      .map(comment => {
        const docAST = doctrine.parse(comment.value, {
          unwrap: true
        })
        const tags = docAST.tags || []
        return {
          alias: getJsDocTagValue(tags, 'alias'),
          name: getJsDocTagValue(tags, 'name'),
          namespace: getJsDocTagValue(tags, 'namespace'),
          nonUI5: !!getJsDocTag(tags, 'nonui5'),
          metadata: getJsDocTagValue(tags, 'metadata'),
          renderer: getJsDocTagValue(tags, 'renderer')
        }
      })
      .filter(classInfo => Object.values(classInfo).some(value => value))
      )[0]
  }
  // Else see if the JSDoc are on the return statement (i..e return class X extends SAPClass)
  else if (node.type === 'ClassExpression' && parent && parent.type === 'ReturnStatement') {
    return getJsDocClassInfo(parent)
  }
  else {
    return {}
  }
}

export function hasJsdocExportFlag(node) {
  if (!node.leadingComments) {
    return false
  }
  return node.leadingComments
  .filter(comment => comment.type === 'CommentBlock')
  .some(comment => {
    return doctrine.parse(comment.value, {
      unwrap: true,
      tags: ['export']
    })
    .tags.length > 0
  })
}
