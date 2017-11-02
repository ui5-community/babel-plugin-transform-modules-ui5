const Path = require('path')
const template = require('babel-template')
const doctrine = require('doctrine')
const assignDefined = require('object-assign-defined')

/*
References:
Babel Plugin Handbook: https://github.com/thejameskyle/babel-handbook/blob/master/translations/en/plugin-handbook.md
AST Spec: https://github.com/babel/babylon/blob/master/ast/spec.md
Babel Types (t.*) https://github.com/babel/babel/tree/master/packages/babel-types
AST Explorer: https://astexplorer.net/
*/

const buildDefine = template(`
  sap.ui.define([SOURCES], function (PARAMS) {
    BODY;
  });
`)

const buildDefineGlobal = template(`
  sap.ui.define([SOURCES], function (PARAMS) {
    BODY;
  }, true);
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

const buildAllExportHelper = template(`
  function extendExports(exports, obj) {
    Object.keys(obj).forEach(function (key) {
      if (key === "default" || key === "__esModule") return;
      Object.defineProperty(exports, key, {
        enumerable: true,
        get: function get() {
          return obj[key];
        }
      });
    });
  }
`)

const buildAllExport = template(`
  extendExports(exports, LOCAL);
`)

const buildReturn = template(`
  return ID;
`)

const buildDefaultImportInterop = template(`
  function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj.default : obj; }
`)

const buildDefaultImportDestructor = template(`
  const LOCAL = _interopRequireDefault(MODULE);
`)

const buildNamedImportDestructor = template(`
  const LOCAL = MODULE[IMPORTED];
`)

const buildAssignment = template(`
  const LOCAL = FROM;
`)

const buildExtendAssign = template(`
  const NAME = SUPERNAME.extend(FQN, OBJECT);
`)

const buildThisAssisment = template(`
  this.NAME = VALUE;
`)

const buildDefaultConstructorFunction = template(`
  function contructor() {
    SUPER.prototype.contructor.apply(this, arguments);
  }
`)

const tempModuleName = (name) => `__${name}`

module.exports = ({ types: t }) => {

  const ProgramVisitor = {
    // Use a ProgramVisitor to efficiently avoid processing the same file twice if babel calls twice.
    // The UI5ModuleVisitor will only be used if it hasn't let ran.
    Program: {
      exit(path, { opts }) {
        if (this.ran) return
        this.ran = true

        this.exportGlobal = false
        this.imports = []
        this.namedExports = []
        this.defaultExport = null
        this.wrap = null
        this.requires = []
        this.namespacePrefix = opts.namespacePrefix


        path.traverse(UI5ModuleVisitor, this)

        if (this.wrap === false) {
          return
        }

        let { node } = path
        let { body } = node

        let allExportHelperAdded = false

        if (this.namedExports.length) {
          node.body.unshift(...[
            buildDeclareExports(),
            buildExportsModuleDeclaration()
          ])
          for (let namedExport of this.namedExports) {
            if (namedExport.all) {
              if (!allExportHelperAdded) {
                node.body.push(
                  buildAllExportHelper()
                )
                allExportHelperAdded = true
              }
              node.body.push(
                buildAllExport(namedExport)
              )
            }
            else {
              node.body.push(
                buildNamedExport(namedExport)
              )
            }
          }
          if (this.defaultExport) {
            node.body.push(
              buildNamedExport({
                EXPORTED: t.identifier('default'),
                LOCAL: this.defaultExport
              })
            )

            // TODO have a flag to enable/disable export interop altogether
            // Add all of default's properties to the export.
            if (this.defaultExportDeclaration.type === 'ObjectExpression' && this.defaultExportDeclaration.properties) {
              for (const property of this.defaultExportDeclaration.properties) {
                const { key, value } = property
                const matchingNamedExport = this.namedExports.find(namedExport => namedExport.EXPORTED.name === key.name)
                if (!matchingNamedExport) { // No matching named export, so it's safe to add
                  node.body.push(
                    buildNamedExport({
                      EXPORTED: key,
                      LOCAL: value
                    })
                  )
                } // Else conflict with a named export
                else if (value && key.name === value.name) {
                  // The value is the same as the named export. No action needed.
                  continue
                }
                else {
                  // TODO have a flag to enable/disable export interop
                  throw path.buildCodeFrameError(`Can't build interop export since default export's key '${key.name}' conflicts with named export.`)
                }
              }
            }
            else if (opts.noUnsafeMixedExports) {
              throw path.buildCodeFrameError('Unsafe mixing of default and named exports. use export default {}.')
            }
          }
          body.push(t.returnStatement(t.identifier('exports')))
        }
        else if (this.defaultExport) {
          body.push(t.returnStatement(this.defaultExport))
        }

        if (this.imports.some(imp => imp.default)) {
          body.unshift(buildDefaultImportInterop())
        }

        node.body = [
          generateDefine(body, this.imports, this.exportGlobal)
        ]
      }
    }
  }

  const UI5ModuleVisitor = {

    /*!
     * Removes the ES6 import and adds the details to the import array in our state.
     */
    ImportDeclaration(path, { opts = {} }) {
      this.wrap = true
      const { node } = path

      const { specifiers, source } = node
      const src = source.value.replace(/\\/g, '/')

      const testLibs = opts.libs || ['^sap/']
      const isLibRE = testLibs.length && new RegExp(`(${testLibs.join('|')})`)
      const isLib = isLibRE.test(src)
      const testSrc = (opts.libs || ['^sap/']).concat(opts.files || [])
      const isUi5SrcRE = testSrc.length && new RegExp(`(${testSrc.join('|')})`)
      const isUi5Src = isUi5SrcRE.test(src)

      const name = src.replace(/\//g, '_').replace(/\./g, '')
      let tmpName = tempModuleName(name)

      const imp = {
        src,
        name,
        isLib,
        isUi5Src,
        tmpName,
      }

      const destructors = []

      for (const specifier of specifiers) {
        if (specifier.type === 'ImportDefaultSpecifier') {
          imp.default = true
          // Shorten the imported as name. The default import should always come first,
          // so this new name will be used for destructoring the other too.
          imp.name = specifier.local.name
          tmpName = imp.tmpName = tempModuleName(imp.name)

          destructors.push(
            buildDefaultImportDestructor({
              MODULE: t.identifier(imp.tmpName),
              LOCAL: specifier.local,
            })
          )
        }
        else if (specifier.type === 'ImportSpecifier') {
          destructors.push(
            buildNamedImportDestructor({
              MODULE: t.identifier(imp.tmpName),
              LOCAL: specifier.local,
              IMPORTED: t.stringLiteral(specifier.imported.name)
            })
          )
        }
        else if (specifier.type === 'ImportNamespaceSpecifier') {
          destructors.push(
            buildAssignment({
              LOCAL: specifier.local,
              FROM: t.identifier(imp.tmpName),
            })
          )
        }
        else {
          throw path.buildCodeFrameError(`Unknown ImportDeclaration specifier type ${specifier.type}`)
        }
      }

      path.replaceWithMultiple(destructors)
      imp.path = path
      this.imports.push(imp)
    },

    /**
     * Push all exports to an array.
     * The reason we don't export in place is to handle the situation
     * where a let or var can be defined, and the latest one should be
     * expored.
     */
    ExportNamedDeclaration(path) {
      this.wrap = true
      const { node } = path
      const { specifiers, declaration, source } = node

      let fromSource = ''
      if (source) { // export { one, two } from 'x'
        const src = source.value
        const name = src.replace(/\//g, '_').replace(/\./g, '')
        const tmpName = tempModuleName(name)
        this.imports.push({ src, name, tmpName })
        fromSource = tmpName + '.'
      }

      if (specifiers && specifiers.length) { // export { one, two }
        for (const specifier of path.node.specifiers) {
          this.namedExports.push({
            LOCAL: t.identifier(`${fromSource}${specifier.local.name}`),
            EXPORTED: specifier.exported
          })
        }
        path.remove()
      }
      else if (declaration) { // export const c = 1 | export function f() {}
        const name = declaration.id && declaration.id.name
        if (name) { // export function f() {}
          const id = t.identifier(declaration.id.name)
          this.namedExports.push({
            LOCAL: id,
            EXPORTED: id
          })
        }
        else if (declaration.declarations) { // export const c = 1
          for (const subDeclaration of declaration.declarations) {
            const id = t.identifier(subDeclaration.id.name)
            this.namedExports.push({
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
      this.defaultExportDeclaration = declaration
      const declarationName = declaration.id && declaration.id.name
      if (hasExportFlag(path.node)) { // check for @export jsdoc
        this.exportGlobal = true
      }
      if (declarationName) {
        // ClassDeclaration or FunctionDeclaration with name.
        // Leave the declaration in-line and preserve the identifier for the return statement.
        path.replaceWith(declaration)
        this.defaultExport = t.identifier(declarationName)
      }
      else {
        // Identifier, ObjectExpression or anonymous FunctionDeclaration
        // Safe to move to the end and return directly
        if (declaration.type === 'FunctionDeclaration') {
          const { params, body, generator, async: isAsync } = declaration
          this.defaultExport = t.functionExpression(null, params, body, generator, isAsync)
        }
        else {
          this.defaultExport = declaration
        }
        path.remove()
      }
    },

    ExportAllDeclaration(path) {
      const src = path.node.source.value
      const name = src.replace(/\//g, '_').replace(/\./g, '')
      const tmpName = tempModuleName(name)

      this.imports.push({ src, name, tmpName })

      this.exportAllHelper = true

      this.namedExports.push({
        all: true,
        LOCAL: t.identifier(tmpName),
      })

      path.remove()
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
          const classInfo = getClassInfo.call(this, path, node, path.parent)
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
          const classInfo = getClassInfo.call(this, path, node, path.parent)
          if (classInfo.nonUI5) {
            return
          }
          this.superClassName = classInfo.superClassName // Tracked for super assignment
          const extendClass = convertClassToUI5Extend(node, classInfo)
          if (path.parent.type === 'ReturnStatement') {
            extendClass.push(buildReturn({
              ID: t.identifier(classInfo.localName)
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
    }

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
    const isImported = imports.some(imported => imported.name === superClass.name)
    return isImported
  }

  function generateDefine(body, imports, exportGlobal) {
    const defineOpts = {
      SOURCES: imports.map(i => t.stringLiteral(i.src)),
      PARAMS: imports.map(i => t.identifier(i.tmpName)),
      BODY: body
    }
    return exportGlobal ? buildDefineGlobal(defineOpts) : buildDefine(defineOpts)
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

  function getClassInfo(path, node, parent) {
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

  function getJsDocClassInfo(node, parent) {
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

  function hasExportFlag(node) {
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

  function getJsDocTagValue(tags, name) {
    const tag = getJsDocTag(tags, name)
    return tag && (tag.name || tag.description)
  }

  function getJsDocTag(tags, name) {
    return tags.find(t => equalsIgnoreCase(name, t.title))
  }

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

  return {
    visitor: ProgramVisitor
  }
}
