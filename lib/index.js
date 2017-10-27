// const Path = require('path')
const template = require('babel-template')

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
        const imports = this.imports
        if (isSuperClassAnImport(node, imports)) {
          // If the super class is one of the imports, we'll assume it's a UI5 managed class,
          // and therefore needs to be transformed to .extend() syntax.
          this.superClassName = node.superClass.name
          replaceClassWithUI5Extend(path)
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
    }

  }

  /**
   * Replace super() call
   */
  function replaceConstructorSuperCall(path, node, superClassName) {
    const identifier = t.identifier(superClassName + '.apply')
    let args = t.arrayExpression(node.arguments)
    if (node.arguments.length === 1 && node.arguments[0].type === 'Identifier' && node.arguments[0].name === 'arguments') {
      args = t.identifier('arguments')
    }
    path.replaceWith(
      t.callExpression(identifier, [
        t.identifier('this'),
        args
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

  function isSuperClassAnImport(node, imports) {
    const superClass = node.superClass
    if (!superClass) {
      return false
    }
    const superClassName = superClass.name
    const isImported = imports.some(imported => imported.name === superClassName)
    if (!isImported) return false
    return superClassName
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
  function replaceClassWithUI5Extend(path) { // eslint-disable-line no-unused-vars
    const node = path.node
    if (node.type !== 'ClassDeclaration') {
      return node
    }
    const staticMembers = []

    const className = node.id.name
    const fullClassName = resolveClass(path, node)
    const superClassName = node.superClass.name
    const classNameIdentifier = t.identifier(className)

    const props = []
    for (const member of node.body.body) {
      const memberExpression = member.static && t.memberExpression(classNameIdentifier, t.identifier(member.key.name))
      if (member.type === 'ClassMethod') {
        const func = t.functionExpression(null, member.params, member.body, member.generator, member.async)
        if (member.static) {
          staticMembers.push(
            t.expressionStatement(
              t.assignmentExpression('=', memberExpression, func)))
        }
        else {
          func.generator = member.generator
          func.async = member.async
          props.push(
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
          props.push(
            t.objectProperty(member.key, member.value)
          )
        }
      }
    }

    const bodyJSON = t.objectExpression(props)
    const extendCallArgs = [
      fullClassName,
      bodyJSON
    ]

    const extendCall = t.callExpression(
      t.identifier(superClassName + '.extend'),
      extendCallArgs
    )
    const extendAssignment = t.variableDeclaration('const', [
      t.variableDeclarator(classNameIdentifier, extendCall)
    ])

    path.replaceWithMultiple([
      extendAssignment,
      ...staticMembers
    ])
  }

  function resolveClass(path, node) {
    const fullClassName = resolveFullName(path, node)
    if (fullClassName) {
      return fullClassName
    }
    else {
      const className = node.id.name
      const namespace = resolveNameSpace(path, node) || ''
      const separator = namespace ? '.' : ''
      // TODO use concat to support variable namespace
      return t.stringLiteral(`${namespace}${separator}${className}`)
    }
  }

  function resolveFullName(path, node) {
    const decorators = node.decorators || []
    const decorator = decorators.find(decorator => decorator.expression.callee.name.toLowerCase() === 'name')
    if (!decorator) return null
    const valueNode = decorator && decorator.expression.arguments[0]
    return valueNode
  }

  function resolveNameSpace(path, node) {
    const decorators = node.decorators || []
    const decorator = decorators.find(decorator => decorator.expression.callee.name.toLowerCase() === 'namespace')
    if (!decorator) {
      throw path.buildCodeFrameError('The \'namespace\' decorator is requires for classes which extend from an imported class.')
    }
    const valueNode = decorator && decorator.expression.arguments[0]
    if (valueNode.type === 'Identifier') {
      // TODO return the Identifier and use a template string or concat
      throw path.buildCodeFrameError('Using a variable in @namespace decorator is currently not supported. Support comming soon.')
    }
    return valueNode.value
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
