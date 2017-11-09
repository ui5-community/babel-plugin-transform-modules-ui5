
import * as t from 'babel-types'
import * as th from './templates'
import Path from 'path'
// import template from 'babel-template'
import assignDefined from 'object-assign-defined'

import { getJsDocClassInfo } from './jsdoc'
import { getDecoratorClassInfo } from './decorators'

/**
 * Converts an ES6 class to a UI5 extend.
 * Any static methods or properties will be moved outside the class body.
 * The path will be updated with the new AST.
 */
export function convertClassToUI5Extend(node, classInfo, extraStaticProps) { // eslint-disable-line no-unused-vars
  if (!(t.isClassDeclaration(node) || t.isClassExpression(node))) {
    return node
  }

  const staticMembers = []

  const classNameIdentifier = node.id
  const superClass = node.superClass // Identifier
  const superClassName = node.superClass.name

  const extendProps = []
  const boundProps = []

  let constructor = null

  for (const propName of ['metadata', 'renderer']) {
    if (extraStaticProps[propName]) {
      extendProps.push(
        t.objectProperty(t.identifier(propName), extraStaticProps[propName])
      )
    }
  }

  for (const member of node.body.body) {
    const memberName = member.key.name
    const memberExpression = member.static && t.memberExpression(classNameIdentifier, member.key)
    if (t.isClassMethod(member)) {
      const func = t.functionExpression(member.key, member.params, member.body, member.generator, member.async)
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
    else if (t.isClassProperty(member)) {
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
        if (t.isArrowFunctionExpression(member.value)) {
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

export function getClassInfo(path, node, parent, pluginOpts) {
  const defaultNamespace = getFileBaseNamespace(path, pluginOpts)

  const localName = node.id.name
  const superClassName = node.superClass && node.superClass.name

  const defaults = { localName, superClassName, namespace: defaultNamespace || '' }

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

/**
 * Reads the namespace from the filepath, but not the name
 */
function getFileBaseNamespace(path, pluginOpts) {
  const opts = path.hub.file.opts
  const filename = Path.resolve(opts.filename)
  const sourceRoot = opts.sourceRoot || process.cwd()
  if (filename.startsWith(sourceRoot)) {
    const filenameRelative = Path.relative(sourceRoot, filename)
    const { dir } = Path.parse(filenameRelative)
    const namespaceParts = dir.split(Path.sep)
    if (pluginOpts.namespacePrefix) {
      namespaceParts.unshift(pluginOpts.namespacePrefix)
    }
    return namespaceParts.join('.')
  }
  else {
    return undefined
  }
}

/**
 * Checks if the CallExpression is sap.ui.define(...) call
 */
export function isSAPUIDefineCallExpression(node) {
  let name = null

  const callee = node.callee

  if (!t.isMemberExpression(callee)) return false

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
