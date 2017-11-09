
// import t from 'babel-types'
import * as th from './helpers/templates'

import { getIdName, getOtherPropertiesOfIdentifier, groupPropertiesByName, getPropNames } from './helpers/ast'
import { getClassInfo, convertClassToUI5Extend, isSAPUIDefineCallExpression } from './helpers/classes'
import { collapseNamedExports } from './helpers/exports'
import { hasJsdocGlobalExportFlag } from './helpers/jsdoc'

/*
References:
Babel Plugin Handbook: https://github.com/thejameskyle/babel-handbook/blob/master/translations/en/plugin-handbook.md
AST Spec: https://github.com/babel/babylon/blob/master/ast/spec.md
Babel Types (t.*) https://github.com/babel/babel/tree/master/packages/babel-types
AST Explorer: https://astexplorer.net/
*/

const tempModuleName = (name) => `__${name}`

module.exports = ({ types: t }) => {

  const ProgramVisitor = {
    // Use a ProgramVisitor to efficiently avoid processing the same file twice if babel calls twice.
    // The UI5ModuleVisitor will only be used if it hasn't let ran.
    Program: {
      exit(path, { opts }) {
        if (this.ran) return
        this.ran = true
        let { node } = path
        let { body } = node

        this.defaultExport = null
        this.defaultExportNode = null

        this.exportGlobal = false
        this.imports = []
        this.namedExports = []
        this.wrap = null
        this.requires = []

        // Opts handling
        this.namespacePrefix = opts.namespacePrefix
        const { noImportInteroptPrefixes = ['sap/'] } = opts
        this.noImportInteroptPrefixesRegexp = new RegExp(noImportInteroptPrefixes.map(p => `(^${p}.*)`).join('|'))

        this.programNode = node

        path.traverse(UI5ModuleVisitor, this)

        if (this.wrap === false) {
          return
        }

        let allExportHelperAdded = false

        opts.collapse = !opts.noExportCollapse
        // opts.extend = !opts.noExportExtend

        // Before adding anything, see if the named exports can be collapsed into the default export.
        if (this.defaultExport && this.namedExports.length && opts.collapse) {
          let filteredExports = collapseNamedExports(node, this.defaultExportDeclaration, this.namedExports, opts)

          if (!filteredExports.length) {
            this.namedExports = []
          }
          else if (!opts.allowUnsafeMixedExports) {
            throw new Error(`Unsafe mixing of default and named exports. The following named exports can't be collapsed or ignored: \n(${getPropNames(filteredExports).join(', ')}).`)
          }

        }

        if (!this.namedExports.length && this.defaultExport) {
          body.push(t.returnStatement(this.defaultExport))
        }
        else if (this.namedExports.length) {

          node.body.unshift(...[
            th.buildDeclareExports(),
            th.buildExportsModuleDeclaration()
          ])

          for (let namedExport of this.namedExports) {
            if (namedExport.all) {
              if (!allExportHelperAdded) {
                node.body.push(
                  th.buildAllExportHelper()
                )
                allExportHelperAdded = true
              }
              node.body.push(
                th.buildAllExport({
                  LOCAL: namedExport.value
                })
              )
            }
            else {
              node.body.push(
                th.buildNamedExport(namedExport)
              )
            }
          }

          if (this.defaultExport) {
            node.body.push(
              th.buildNamedExport({
                key: t.identifier('default'),
                value: this.defaultExport
              })
            )

            // TODO have a flag to enable/disable export interop altogether
            // Add all of default's properties to the export.
            if (t.isObjectExpression(this.defaultExportDeclaration) && this.defaultExportDeclaration.properties) {
              for (const property of this.defaultExportDeclaration.properties) {
                const { key, value } = property
                const matchingNamedExport = this.namedExports.find(namedExport => namedExport.key.name === key.name)
                if (!matchingNamedExport) { // No matching named export, so it's safe to add
                  node.body.push(
                    th.buildNamedExport({
                      key, value
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
          }
          body.push(t.returnStatement(t.identifier('exports')))
        }

        // setInteroptFlag(this.imports, opts)

        if (this.imports.some(imp => imp.interopt)) {
          body.unshift(th.buildDefaultImportInterop())
        }

        node.body = [
          generateDefine(body, this.imports, (this.exportGlobal || opts.exportAllGlobal))
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

      const noInteropt = this.noImportInteroptPrefixesRegexp.test(src)

      const testLibs = opts.libs || ['^sap/']
      const isLibRE = testLibs.length && new RegExp(`(${testLibs.join('|')})`)
      const isLib = isLibRE.test(src)
      const testSrc = (opts.libs || ['^sap/']).concat(opts.files || [])
      const isUi5SrcRE = testSrc.length && new RegExp(`(${testSrc.join('|')})`)
      const isUi5Src = isUi5SrcRE.test(src)

      const name = src.replace(/\//g, '_').replace(/\./g, '') // default to the src for import without named var
      let tmpName = noInteropt ? name : tempModuleName(name)

      const imp = {
        src,
        name,
        isLib,
        isUi5Src,
        tmpName,
      }

      const destructors = []

      for (const specifier of specifiers) {
        if (t.isImportDefaultSpecifier(specifier)) {
          imp.default = true
          imp.interopt = !noInteropt

          // Shorten the imported as name. The default import should always come first,
          // so this new name will be used for destructoring the other too.
          imp.name = specifier.local.name
          tmpName = imp.tmpName = noInteropt ? imp.name : tempModuleName(imp.name )

          if (!noInteropt) {
            destructors.push(
              th.buildDefaultImportDestructor({
                MODULE: t.identifier(imp.tmpName),
                LOCAL: specifier.local,
              })
            )
          }
        }
        else if (t.isImportSpecifier(specifier)) {
          destructors.push(
            th.buildNamedImportDestructor({
              MODULE: t.identifier(imp.tmpName),
              LOCAL: specifier.local,
              IMPORTED: t.stringLiteral(specifier.imported.name)
            })
          )
        }
        else if (t.isImportNamespaceSpecifier(specifier)) {
          destructors.push(
            th.buildConstDeclaration({
              NAME: specifier.local,
              VALUE: t.identifier(imp.tmpName),
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
            key: specifier.exported,
            value: t.identifier(`${fromSource}${specifier.local.name}`),
          })
        }
        path.remove()
      }
      else if (declaration) { // export const c = 1 | export function f() {}
        const name = getIdName(declaration)
        if (name) { // export function f() {}
          const id = t.identifier(declaration.id.name)
          this.namedExports.push({
            key: id,
            value: id,
          })
        }
        else if (declaration.declarations) { // export const c = 1
          for (const subDeclaration of declaration.declarations) {
            const id = t.identifier(subDeclaration.id.name)
            this.namedExports.push({
              value: id,
              key: id
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
      const { node } = path
      const { declaration } = node
      this.defaultExportDeclaration = declaration
      const declarationName = getIdName(declaration)
      if (hasGlobalExportFlag(node)) { // check for @export jsdoc
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
        if (t.isFunctionDeclaration(declaration)) {
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
        value: t.identifier(tmpName),
      })

      path.remove()
    },

    /**
     * ClassDeclaration visitor.
     * Use both enter() and exit() to track when the visitor is inside a UI5 class,
     * in order to convert the super calls.
     * No changes for non-UI5 classes.
     */
    Class: {
      enter(path, { opts = {} }) {
        const { node, parent, parentPath } = path

        if (opts.neverConvertClass) return
        if (doesClassExtendFromImport(node, [...this.imports, ...this.requires])) {
          const { name } = node.id
          // If the super class is one of the imports, we'll assume it's a UI5 managed class,
          // and therefore needs to be transformed to .extend() syntax.
          const classInfo = getClassInfo(path, node, path.parent, opts)
          if (classInfo.nonUI5 || (opts.onlyConvertNamedClass && !classInfo.name)) {
            return
          }
          this.superClassName = classInfo.superClassName

          // Find the Block scoped parent (Program or Function body) and search for assigned properties within that.
          const blockParent = path.findParent(path => path.isBlock()).node
          const staticProps = groupPropertiesByName(getOtherPropertiesOfIdentifier(blockParent, name))
          // TODO flag metadata and renderer for removal if applicable
          const ui5ExtendClass = convertClassToUI5Extend(node, classInfo, staticProps)

          if (path.isClassDeclaration()) { // class X {}
            path.replaceWithMultiple(ui5ExtendClass)
          }
          else if (path.isClassExpression()) { // return class X {}
            if (t.isReturnStatement(parent)) {
              // Add the return statement back before calling replace
              ui5ExtendClass.push(th.buildReturn({
                ID: t.identifier(classInfo.localName)
              }))
            }
            parentPath.replaceWithMultiple(ui5ExtendClass)
          }
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
        if (t.isSuper(node.callee)) {
          replaceConstructorSuperCall(path, node, this.superClassName)
        }
        else if (t.isSuper(node.callee.object)) {
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
    node.arguments.unshift(t.identifier('this'))
    path.replaceWith(
      t.callExpression(t.identifier(`${superClassName}.prototype.constructor.call`), node.arguments))
  }

  /**
   * Replace super.method() call
   */
  function replaceObjectSuperCall(path, node, superClassName) {
    node.arguments.unshift(t.identifier('this'))
    const callIdentifier = t.identifier(`${superClassName}.prototype.${node.callee.property.name}.call`)
    path.replaceWith(t.callExpression(callIdentifier, node.arguments))
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
    return exportGlobal ? th.buildDefineGlobal(defineOpts) : th.buildDefine(defineOpts)
  }

  function isIIFE(node) {
    return (t.isCallExpression(node) && t.isFunctionExpression(node.callee))
  }

  function hasGlobalExportFlag(node) {
    return hasJsdocGlobalExportFlag(node)
  }

  return {
    visitor: ProgramVisitor
  }
}
