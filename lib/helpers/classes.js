
import * as t from 'babel-types'
import * as th from './templates'
import Path from 'path'
// import template from 'babel-template'
import assignDefined from 'object-assign-defined'

import { getJsDocClassInfo, getTags } from './jsdoc'
import { getDecoratorClassInfo } from './decorators'

/**
 * Converts an ES6 class to a UI5 extend.
 * Any static methods or properties will be moved outside the class body.
 * The path will be updated with the new AST.
 */
export function convertClassToUI5Extend(path, node, classInfo, extraStaticProps, opts) { // eslint-disable-line no-unused-vars
  if (!(t.isClassDeclaration(node) || t.isClassExpression(node))) {
    return node
  }

  const staticMembers = []

  const classNameIdentifier = node.id
  const className = classNameIdentifier.name
  const superClass = node.superClass // Identifier
  const superClassName = node.superClass.name
  const isController = className.includes('Controller') || !!classInfo.controller
  const movePropsToOnInit = isController && opts.moveControllerPropsToOnInit
  const moveStaticStaticPropsToExtend = isController && opts.addControllerStaticPropsToExtend

  const extendProps = []
  const boundProps = []

  const CONSTRUCTOR = 'constructor'
  const propsByName = {}
  let constructor
  let constructorComments

  const staticPropsToAdd = (moveStaticStaticPropsToExtend) ? Object.keys(extraStaticProps) : ['metadata', 'renderer']

  for (const propName of staticPropsToAdd) {
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
        propsByName[memberName] = func
        func.generator = member.generator
        func.async = member.async
        if (member.kind === 'get' || member.kind === 'set') {
          extendProps.push(
            t.objectMethod(member.kind, member.key, member.params, member.body, member.computed)
          )
        }
        else { // method
          if (memberName === CONSTRUCTOR) {
            constructorComments = member.leadingComments
            constructor = func
            if (movePropsToOnInit) {
              continue // don't push to props yet
            }
          }
          func.id = path.scope.generateUidIdentifier(func.id.name) // Give the function a unique name
          extendProps.push(
            t.objectProperty(member.key, func)
          )
        }
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
        if (moveStaticStaticPropsToExtend) {
          extendProps.unshift(
            t.objectProperty(member.key, member.value)
          )
        }
        else {
          staticMembers.push(
            t.expressionStatement(
              t.assignmentExpression('=', memberExpression, member.value))
          )
        }
      }
      else {
        propsByName[memberName] = member.value
        if (t.isArrowFunctionExpression(member.value)) {
          boundProps.push(member)
        }
        else {
          if (memberName === 'constructor') {
            constructorComments = member.leadingComments
            constructor = member.value
            if (movePropsToOnInit) {
              continue // don't push to props yet
            }
          }
          extendProps.push(
            t.objectProperty(member.key, member.value)
          )
        }
      }
    }
  }

  // Arrow function properties need to get moved to the constructor so that
  // they're bound properly to the class instance, to align with the spec.
  // For controllers, use onInit rather than constructor, since controller constructors don't work.
  // Also move the constructor's statements to the onInit.

  const bindToMethodName = movePropsToOnInit ? 'onInit' : 'constructor'
  const bindToId = t.identifier(bindToMethodName)
  let bindMethod = movePropsToOnInit ? propsByName[bindToMethodName] : constructor // avoid getting a prop named constructor as it may return {}'s
  const constructorJsdoc = getTags(constructorComments)
  const keepConstructor = classInfo.keepConstructor || constructorJsdoc.keep

  const needsBindingMethod = boundProps.length || (movePropsToOnInit && constructor && !keepConstructor)

  // See if we need to inject the 'constructor' or 'onInit' method, depending which one we'll bind to.
  if (needsBindingMethod && !bindMethod) {
    const fn = th.buildInheritingFunction({
      NAME: bindToId,
      SUPER: t.identifier(superClassName)
    })
    // Need to convert FunctionDeclaration to FunctionExpression
    bindMethod = t.functionExpression(
      fn.id, fn.params, fn.body, fn.generator, fn.async
    )
    extendProps.unshift(
      t.objectProperty(bindToId, bindMethod)
    )
  }

  if (movePropsToOnInit && constructor) {
    if (keepConstructor) {
      extendProps.unshift(
        t.objectProperty(t.identifier(CONSTRUCTOR), constructor)
      )
    }
    else {
      bindMethod.body.body.unshift(
        ...(constructor.body.body
          .filter(node => (!(t.isCallExpression(node.expression) && node.expression.callee.type === 'Super')))
        )
      )
    }
  }

  if (boundProps.length) {
    bindMethod.body.body.push(...boundProps.map(prop => {
      return th.buildThisAssignment({
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
  const defaults = {
    localName: node.id.name,
    superClassName: (node.superClass && node.superClass.name),
    namespace: getFileBaseNamespace(path, pluginOpts) || ''
  }
  const decoratorInfo = getDecoratorClassInfo(node)
  const jsDocInfo = getJsDocClassInfo(node, parent)
  return assignDefined(defaults, decoratorInfo, jsDocInfo)
}

/**
 * Reads the namespace from the file path, but not the name
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
