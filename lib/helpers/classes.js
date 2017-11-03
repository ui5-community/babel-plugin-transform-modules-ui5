import * as t from 'babel-types'
import * as th from './templates'
import Path from 'path'
// import template from 'babel-template'
import assignDefined from 'object-assign-defined'

import { getJsDocClassInfo, hasJsdocExportFlag } from './jsdoc'

/**
 * Converts an ES6 class to a UI5 extend.
 * Any static methods or properties will be moved outside the class body.
 * The path will be updated with the new AST.
 */
export function convertClassToUI5Extend(node, classInfo) { // eslint-disable-line no-unused-vars
  if (!(node.type === 'ClassDeclaration' || node.type === 'ClassExpression')) {
    return node
  }

  const staticMembers = []

  const classNameIdentifier = node.id
  const superClass = node.superClass // Identifier
  const superClassName = node.superClass.name

  const extendProps = []
  const boundProps = []

  let constructor = null

  if (classInfo.metadata) {
    extendProps.push(
      t.objectProperty(t.identifier('metadata'), t.identifier(classInfo.metadata))
    )
  }

  if (classInfo.renderer) {
    extendProps.push(
      t.objectProperty(t.identifier('renderer'), t.identifier(classInfo.renderer))
    )
  }

  for (const member of node.body.body) {
    const memberName = member.key.name
    const memberExpression = member.static && t.memberExpression(classNameIdentifier, member.key)
    if (member.type === 'ClassMethod') {
      const func = t.functionExpression(null, member.params, member.body, member.generator, member.async)
      if (member.static) {
        staticMembers.push(
          t.expressionStatement(
            t.assignmentExpression('=', memberExpression, func))
        )
      }
      else {
        if (memberName === 'constructor') {
          constructor = func
        }
        func.generator = member.generator
        func.async = member.async
        extendProps.push(
          t.objectProperty(member.key, func)
        )
      }
    }
    else if (member.type === 'ClassProperty') {
      if (memberName === 'metadata' || memberName === 'renderer') {
        // Special handling for TypeScript limitation where metadata and renderer must be properties.
        extendProps.unshift(
          t.objectProperty(member.key, member.value)
        )
      }
      else if (member.static) {
        staticMembers.push(
          t.expressionStatement(
            t.assignmentExpression('=', memberExpression, member.value))
        )
      }
      else {
        if (memberName === 'constructor') {
          constructor = member.value
        }
        if (member.value.type === 'ArrowFunctionExpression') {
          boundProps.push(member)
        }
        else {
          extendProps.push(
            t.objectProperty(member.key, member.value)
          )
        }
      }
    }
  }

  // Arrow function properties need to get moved to the constructor so that
  // they're bound properly to the class instance, to align with the spec.
  if (boundProps.length) {
    if (!constructor) {
      const fn = th.buildDefaultConstructorFunction({
        SUPER: t.identifier(superClassName)
      })
      // Need to convert FunctionDeclaration to FunctionExpression
      constructor = t.functionExpression(
        fn.id, fn.params, fn.body, fn.generator, fn.async
      )
      extendProps.unshift(
        t.objectProperty(
          t.identifier('constructor'),
          constructor)
      )
    }
    constructor.body.body.push(...boundProps.map(prop => {
      return th.buildThisAssisment({
        NAME: prop.key,
        VALUE: prop.value
      })
    }))
  }

  const extendAssign = th.buildExtendAssign({
    NAME: classNameIdentifier,
    SUPERNAME: superClass,
    FQN: t.stringLiteral(getFullyQualifiedName(classInfo)),
    OBJECT: t.objectExpression(extendProps)
  })

  return [
    extendAssign,
    ...staticMembers
  ]
}

function getFullyQualifiedName(classInfo) {
  if (classInfo.alias) return classInfo.alias
  if (classInfo.name) return classInfo.name
  const separator = classInfo.namespace ? '.' : ''
  return `${classInfo.namespace}${separator}${classInfo.localName}`
}

export function getClassInfo(path, node, parent) {
  const fileBaseClassInfo = getFileBaseClassInfo.call(this, path)

  const localName = node.id.name
  const superClassName = node.superClass && node.superClass.name

  const defaults = assignDefined({},
    { localName, superClassName, namespace: '', },
    fileBaseClassInfo
  )

  const decoratorInfo = getDecoratorClassInfo(node)
  if (decoratorInfo) {
    return assignDefined(defaults, decoratorInfo)
  }

  const jsDocInfo = getJsDocClassInfo(node, parent)
  if (jsDocInfo) {
    return assignDefined(defaults, jsDocInfo)
  }

  return defaults
}

function getDecoratorClassInfo(node) {
  const decorators = node.decorators
  if (!decorators  || !decorators.length) {
    return null
  }
  return {
    alias: getDecoratorValue(findDecoratorByName(decorators, 'alias')),
    name: getDecoratorValue(findDecoratorByName(decorators, 'name')),
    namespace: getDecoratorValue(findDecoratorByName(decorators, 'namespace')),
    nonUI5: !!findDecoratorByName(decorators, 'nonui5'),
    ui5: getDecoratorValue(findDecoratorByName(decorators, 'ui5'))
  }
}

function findDecoratorByName(decorators, name) {
  return decorators && decorators
    .find(decorator => {
      const expression = decorator.expression
      return (
        equalsIgnoreCase(name, expression.name) ||
        equalsIgnoreCase(name, expression.callee && expression.callee.name)
      )
    })
}

function getDecoratorValue(decorator) {
  return ((decorator && decorator.expression.arguments[0]) || {}).value
}

export function hasExportFlag(node) {
  return hasJsdocExportFlag(node)
}

function getFileBaseClassInfo(path) {
  const opts = path.hub.file.opts
  const filename = Path.resolve(opts.filename)
  const sourceRoot = opts.sourceRoot || process.cwd()
  if (filename.startsWith(sourceRoot)) {
    const filenameRelative = Path.relative(sourceRoot, filename)
    const { dir } = Path.parse(filenameRelative)
    const namespaceParts = dir.split(Path.sep)
    if (this.namespacePrefix) {
      namespaceParts.unshift(this.namespacePrefix)
    }
    return {
      namespace: namespaceParts.join('.')
    }
  }
  else {
    return null
  }
}

function equalsIgnoreCase(str1, str2) {
  if (!str1 && !str2) return true
  else if (!str1 || !str2) return false
  else return str1.toLowerCase() === str2.toLowerCase()
}

/**
 * Checks if the CallExpression is sap.ui.define(...) call
 */
export function isSAPUIDefineCallExpression(node) {
  let name = null

  const callee = node.callee

  if (callee.type !== 'MemberExpression') return false

  node = callee
  name = node.name || (node.property && node.property.name) // property won't be there for an anonymous function
  if (name !== 'define') return false

  node = node.object
  name = node.name || node.property.name
  if (name !== 'ui') return false

  node = node.object
  name = node.name || node.property.name
  if (name !== 'sap') return false

  return true
}
