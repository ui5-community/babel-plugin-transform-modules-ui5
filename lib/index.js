// const Path = require('path')
const template = require('babel-template')
const doctrine = require('doctrine')

const buildDefine = template(`
  sap.ui.define([SOURCES], FACTORY);
`)

const buildDefineCallback = template(`
  (function (PARAMS) {
    BODY;
  })
`)

const buildDeclareExports = template(`
  const exports = {};
`)

const buildExportsModuleDeclaration = template(`
  Object.defineProperty(exports, "__esModule", {
    value: true
  });
`)

const buildNamedExport = template(`
  exports.EXPORTED = LOCAL;
`)

const buildReturn = template(`
    return ID;
`)

const buildDefaultImportInterop = template(`
  function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj.default : obj; }
`)

const buildNamedImportInterop = template(`
  function _interopRequireNamed(obj, name) { return obj && obj[name]; }
`)

const buildDefaultImportDestructor = template(`
  const LOCAL = _interopRequireDefault(MODULE);
`)

const buildNamedImportDestructor = template(`
  const LOCAL = _interopRequireNamed(MODULE, IMPORTED);
`)

const buildAssignment = template(`
  const LOCAL = FROM;
`)

const buildExtendAssign = template(`
  const NAME = SUPERNAME.extend(FULLNAME, OBJECT);
`)

const buildThisAssisment = template(`
  this.NAME = VALUE;
`)

const buildDefaultConstructorFunction = template(`
  function contructor() {
    SUPER.prototype.contructor.apply(this, arguments)
  }
`)

const tempModuleName = (name) => `__${name}`

// const bHelper = require('babel-helper-module-transforms') // Not until babel 7

/*
References:
Babel Plugin Handbook: https://github.com/thejameskyle/babel-handbook/blob/master/translations/en/plugin-handbook.md
AST Spec: https://github.com/babel/babylon/blob/master/ast/spec.md
Babel Types (t.*) https://github.com/babel/babel/tree/master/packages/babel-types
*/

module.exports = ({ types: t }) => {

  const tempModuleIdentifier = (name) => t.identifier(tempModuleName(name))

  const ProgramVisitor = {
    // Use a ProgramVisitor to efficiently avoid processing the same file twice if babel calls twice.
    // The UI5ModuleVisitor will only be used if it hasn't let ran.
    Program: {
      exit(path) {
        if (this.ran) return
        this.ran = true

        this.imports = []
        this.exports = []
        this.export = null
        this.wrap = null
        this.requires = []

        path.traverse(UI5ModuleVisitor, this)

        if (this.wrap === false) {
          return
        }

        let { node } = path
        let { body } = node

        if (this.exports.length) {
          node.body.unshift(...[
            buildDeclareExports(),
            buildExportsModuleDeclaration()
          ])
          for (let exp of this.exports) {
            node.body.push(
              buildNamedExport(exp)
            )
          }
          if (this.export) {
            node.body.push(
              buildNamedExport({
                EXPORTED: t.identifier('default'),
                LOCAL: this.export
              })
            )
          }
          body.push(t.returnStatement(t.identifier('exports')))
        }
        else if (this.export) {
          body.push(t.returnStatement(this.export))
        }

        if (this.imports.some(imp => imp.named)) {
          body.unshift(buildNamedImportInterop())
        }
        if (this.imports.some(imp => imp.default)) {
          body.unshift(buildDefaultImportInterop())
        }

        node.body = [
          generateDefine(body, this.imports)
        ]
      }
    }
  }

  const UI5ModuleVisitor = {

    /*!
     * Removes the ES6 import and adds the details to the import array in our state.
     */
    ImportDeclaration(path) {
      this.wrap = true
      const { node } = path

      const { specifiers, source } = node
      const src = source.value.replace(/\\/g, '/')

      const _import = { src, name: src.replace(/\//g, '_').replace(/\./g, '') }
      this.imports.push(_import)

      const destructors = []

      for (const specifier of specifiers) {
        if (specifier.type === 'ImportDefaultSpecifier') {
          _import.default = true
          // Shorten the imported as name. The default import should always come first,
          // so this new name will be used for destructoring the other too.
          _import.name = specifier.local.name
          destructors.push(
            buildDefaultImportDestructor({
              MODULE: tempModuleIdentifier(_import.name),
              LOCAL: specifier.local,
            })
          )
        }
        else if (specifier.type === 'ImportSpecifier') {
          _import.named = true
          destructors.push(
            buildNamedImportDestructor({
              MODULE: tempModuleIdentifier(_import.name),
              LOCAL: specifier.local,
              IMPORTED: t.stringLiteral(specifier.imported.name)
            })
          )
        }
        else if (specifier.type === 'ImportNamespaceSpecifier') {
          // TODO clone obj and remove default as per spec (and __esModule ?)
          destructors.push(
            buildAssignment({
              LOCAL: specifier.local,
              FROM: tempModuleIdentifier(_import.name),
            })
          )
        }
        else {
          throw path.buildCodeFrameError(`Unknown ImportDeclaration specifier type ${specifier.type}`)
        }
      }

      path.replaceWithMultiple(destructors)
    },

    ExportNamedDeclaration(path) {
      this.wrap = true
      const specifiers = path.node.specifiers
      const declaration = path.node.declaration
      if (specifiers && specifiers.length) { // export { one, two }
        for (const specifier of path.node.specifiers) {
          this.exports.push({
            LOCAL: specifier.local,
            EXPORTED: specifier.exported
          })
        }
        path.remove()
      }
      else if (declaration) {
        const name = declaration.id && declaration.id.name
        if (name) { // export function a() {}
          const id = t.identifier(declaration.id.name)
          this.exports.push({
            LOCAL: id,
            EXPORTED: id
          })
        }
        else if (declaration.declarations) { // export const a = 1
          for (const subDeclaration of declaration.declarations) {
            const id = t.identifier(subDeclaration.id.name)
            this.exports.push({
              LOCAL: id,
              EXPORTED: id
            })
          }
        }
        else {
          throw path.buildCodeFrameError('Unknown ExportNamedDeclartion shape.')
        }
        path.replaceWith(declaration)
      }
      else {
        throw path.buildCodeFrameError('Unknown ExportNamedDeclartion shape.')
      }
    },

    /*!
     * Replaces the ES6 export with sap.ui.define by using the state.imports array built up when
     * visting ImportDeclaration.
     * Only a single 'export default' is supported.
     */
    ExportDefaultDeclaration(path) {
      this.wrap = true
      const declaration = path.node.declaration
      const declarationName = declaration.id && declaration.id.name
      if (declarationName) {
        // ClassDeclaration or FunctionDeclaration with name.
        // Leave the declaration in-line and preserve the identifier for the return statement.
        path.replaceWith(declaration)
        this.export = t.identifier(declarationName)
      }
      else {
        // Identifier, ObjectExpression or anonymous FunctionDeclaration
        // Safe to move to the end and return directly
        if (declaration.type === 'FunctionDeclaration') {
          const { params, body, generator, async: isAsync } = declaration
          this.export = t.functionExpression(null, params, body, generator, isAsync)
        }
        else {
          this.export = declaration
        }
        path.remove()
      }
    },

    /**
     * ClassDeclaration visitor.
     * Use both enter() and exit() to track when the visitor is inside a UI5 class,
     * in order to convert the super calls.
     * No changes for non-UI5 classes.
     */
    ClassDeclaration: {
      enter(path) {
        const node = path.node
        if (doesClassExtendFromImport(node, [...this.imports, ...this.requires])) {
          // If the super class is one of the imports, we'll assume it's a UI5 managed class,
          // and therefore needs to be transformed to .extend() syntax.
          const classInfo = getClassInfo(node, path.parent)
          if (classInfo.nonUI5) {
            return
          }
          this.superClassName = classInfo.superClassName
          path.replaceWithMultiple(
            convertClassToUI5Extend(node, classInfo)
          )
        }
      },
      exit() {
        this.superClassName = null
      }
    },

    ClassExpression: {
      enter(path) {
        const node = path.node
        if (doesClassExtendFromImport(node, [...this.imports, ...this.requires])) {
          // If the super class is one of the imports, we'll assume it's a UI5 managed class,
          // and therefore needs to be transformed to .extend() syntax.
          const classInfo = getClassInfo(node, path.parent)
          if (classInfo.nonUI5) {
            return
          }
          this.superClassName = classInfo.superClassName // Tracked for super assignment
          const extendClass = convertClassToUI5Extend(node, classInfo)
          if (path.parent.type === 'ReturnStatement') {
            extendClass.push(buildReturn({
              ID: t.identifier(classInfo.name)
            }))
          }
          path.parentPath.replaceWithMultiple(extendClass)
        }
      },
      exit() {
        this.superClassName = null
      }
    },

    /*!
     * Visits function calls.
     */
    CallExpression(path) {
      const node = path.node

      // If state.wrap is still null, this IIFE was enconuntered before any other calls, imports or exports.
      if (isIIFE(node) && !this.wrap) {
        this.wrap = false
        return
      }
      // If the file already has SAPUIDefine, then don't wrap. Keep visiting so we can fix non-class constructor()
      else if (isSAPUIDefineCallExpression(node)) {
        this.wrap = false
        this.requires = getRequiredParamsOfSAPUIDefine(path, node)
        return
      }
      // If we encounter a call expression prior to a wrapping iife or sap.ui.define,
      // then we need to wrap with sap.ui.defined
      else if (this.wrap !== false) {
        this.wrap = true
      }

      if (this.superClassName) {
        if (node.callee.type === 'Super') {
          replaceConstructorSuperCall(path, node, this.superClassName)
        }
        else if (node.callee.object && node.callee.object.type === 'Super') {
          replaceObjectSuperCall(path, node, this.superClassName)
        }
      }
    },

    /**
     * Convert object method constructor() to constructor: function constructor(),
     * since a UI5 class is not a real class.
     */
    ObjectMethod(path) {
      const { node } = path
      const CONSTRUCTOR = 'constructor'
      if (node.key.name === CONSTRUCTOR) {
        // The keyword 'constructor' should not be used as a shorthand
        // method name in an object. It might(?) work on some objects,
        // but it doesn't work with X.extend(...) inheritance.
        path.replaceWith(
          t.objectProperty(
            t.identifier(CONSTRUCTOR),
            t.functionExpression(
              t.identifier(CONSTRUCTOR),
              node.params,
              node.body)))
      }
    },



  }

  function getRequiredParamsOfSAPUIDefine(path, node) {
    const defineArgs = node.arguments
    const callbackNode = defineArgs
      .find(argNode => (argNode.type === 'ArrowFunctionExpression' || argNode.type === 'FunctionExpression'))
    return callbackNode.params // Identifier
  }

  /**
   * Replace super() call
   */
  function replaceConstructorSuperCall(path, node, superClassName) {
    //const hasArgs = node.arguments.length === 1 && node.arguments[0].type === 'Identifier' && node.arguments[0].name === 'arguments'
    path.replaceWith(
      t.callExpression(t.identifier(superClassName + '.constructor.apply'), [
        t.identifier('this'),
        t.arrayExpression(node.arguments)
      ]))
  }

  /**
   * Replace super.method() call
   */
  function replaceObjectSuperCall(path, node, superClassName) {
    // super.method() call
    const identifier = t.identifier(superClassName + '.prototype' + '.' + node.callee.property.name + '.apply')
    path.replaceWith(
      t.callExpression(identifier, [
        t.identifier('this'),
        t.arrayExpression(node.arguments)
      ]))
  }

  function doesClassExtendFromImport(node, imports) {
    const superClass = node.superClass
    if (!superClass) {
      return false
    }
    const superClassName = superClass.name
    const isImported = imports.some(imported => imported.name === superClassName)
    return isImported
  }

  function generateDefine(body, imports) {
    return buildDefine({
      SOURCES: imports.map(i => t.stringLiteral(i.src)),
      FACTORY: buildDefineCallback({
        PARAMS: imports.map(i => tempModuleIdentifier(i.name)),
        BODY: body
          //...(this.export ? t.returnStatement(this.export) : [])
      })
    })
  }

  /**
   * Converts an ES6 class to a UI5 extend.
   * Any static methods or properties will be moved outside the class body.
   * The path will be updated with the new AST.
   */
  function convertClassToUI5Extend(node, classInfo) { // eslint-disable-line no-unused-vars
    if (!(node.type === 'ClassDeclaration' || node.type === 'ClassExpression')) {
      return node
    }

    const staticMembers = []

    const createFullName = (classInfo) => {
      const separator = classInfo.namespace ? '.' : ''
      return `${classInfo.namespace}${separator}${classInfo.name}`
    }

    const classNameIdentifier = node.id
    const fullClassName = classInfo.fullname || createFullName(classInfo.namespace, classInfo)
    const superClass = node.superClass // Identifier
    const superClassName = node.superClass.name

    const extendProps = []
    const boundProps = []

    let constructor = null

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
        if (member.static) {
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
        const fn = buildDefaultConstructorFunction({
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
        return buildThisAssisment({
          NAME: prop.key,
          VALUE: prop.value
        })
      }))
    }

    const extendAssign = buildExtendAssign({
      NAME: classNameIdentifier,
      SUPERNAME: superClass,
      FULLNAME: t.stringLiteral(fullClassName),
      OBJECT: t.objectExpression(extendProps)
    })

    return [
      extendAssign,
      ...staticMembers
    ]
  }

  function getClassInfo(node, parent) {
    const name = node.id.name
    const superClassName = node.superClass && node.superClass.name

    const decoratorInfo = getDecoratorClassInfo(node)
    if (decoratorInfo) {
      return Object.assign(decoratorInfo, {
        superClassName, name
      })
    }

    const jsDocInfo = getJsDocClassInfo(node, parent)
    if (jsDocInfo) {
      return Object.assign(jsDocInfo, {
        superClassName, name
      })
    }

    return {
      superClassName, name,
      namespace: '' //TODO get from file
    }
  }

  function getDecoratorClassInfo(node) {
    const decorators = node.decorators
    if (!decorators  || !decorators.length) {
      return null
    }
    return {
      fullname: getDecoratorValue(findDecoratorByName(decorators, 'name')),
      namespace: getDecoratorValue(findDecoratorByName(decorators, 'namespace')),
      nonUI5: !!findDecoratorByName(decorators, 'nonui5'),
      ui5: getDecoratorValue(findDecoratorByName(decorators, 'ui5'))
    }
  }

  function findDecoratorByName(decorators, name) {
    return decorators && decorators
      .find(decorator => equalsIgnoreCase(decorator.expression.callee.name, name))
  }

  function getDecoratorValue(decorator) {
    return ((decorator && decorator.expression.arguments[0]) || {}).value
  }

  function getJsDocClassInfo(node, parent) {
    if (node.leadingComments) {
      return node.leadingComments
        .filter(comment => comment.type === 'CommentBlock')
        .map(comment => {
          const docAST = doctrine.parse(comment.value, {
            unwrap: true
          })
          const tags = docAST.tags || []
          const classInfo = {
            fullname: getJsDocTagValue(tags, 'name'),
            namespace: getJsDocTagValue(tags, 'namespace'),
            nonui5: getJsDocTagValue(tags, 'nonui5'),
          }
          if (classInfo.fullname || classInfo.namespace || classInfo.nonui5) {
            return classInfo
          }
          else {
            return null
          }
        })
        .filter(it => it)[0]
    }
    // Else see if the JSDoc are on the return statement
    else if (node.type === 'ClassExpression' && parent && parent.type === 'ReturnStatement') {
      return getJsDocClassInfo(parent)
    }
    else {
      return {
        fullname: null,
        namespace: null
      }
    }
  }

  function getJsDocTagValue(tags, name) {
    const tag = tags.find(t => equalsIgnoreCase(t.title, name))
    return tag && tag.name
  }

  // function resolveFullName(path, node) {
  //   const decorators = node.decorators || []
  //   const decorator = decorators.find(decorator => decorator.expression.callee.name.toLowerCase() === 'name')
  //   if (!decorator) return null
  //   const valueNode = decorator && decorator.expression.arguments[0]
  //   return valueNode
  // }
  //
  // function resolveNameSpace(path, node) {
  //   const decorators = node.decorators || []
  //   const decorator = decorators.find(decorator => decorator.expression.callee.name.toLowerCase() === 'namespace')
  //   if (!decorator) {
  //     return null
  //   }
  //   const valueNode = decorator && decorator.expression.arguments[0]
  //   if (valueNode.type === 'Identifier') {
  //     // TODO return the Identifier and use a template string or concat
  //     throw path.buildCodeFrameError('Using a variable in @namespace decorator is currently not supported. Support comming soon.')
  //   }
  //   return valueNode.value
  // }

  function equalsIgnoreCase(str1, str2) {
    if (!str1 && !str2) return true
    else if (!str1 || !str2) return false
    else return str1.toLowerCase() === str2.toLowerCase()
  }

  /**
   * Checks if the CallExpression is sap.ui.define(...) call
   */
  function isSAPUIDefineCallExpression(node) {
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

  function isIIFE(node) {
    return (node.type === 'CallExpression' && node.callee.type === 'FunctionExpression')
  }

  // function getSourceRoot(path) {
  //   let sourceRootPath = null
  //   if (path.hub.file.opts.sourceRoot) {
  //     sourceRootPath = Path.resolve(path.hub.file.opts.sourceRoot)
  //   }
  //   else {
  //     sourceRootPath = Path.resolve("." + Path.sep)
  //   }
  //   return sourceRootPath
  // }

  return {
    // the commonjs module gives us the Object.defineProperty
    // inherits: require('babel-plugin-transform-es2015-modules-commonjs'),
    visitor: ProgramVisitor
  }
}
