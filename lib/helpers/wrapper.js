
import * as t from 'babel-types'
import * as th from './templates'
import { getPropNames } from './ast'
import { collapseNamedExports } from './exports'

export function wrap(visitor, programNode, opts) {

  let {
    defaultExport,
    defaultExportDeclaration,
    exportGlobal,
    firstImport,
    injectDynamicImportHelper,
    imports,
    namedExports,
  } = visitor

  let { body } = programNode

  let allExportHelperAdded = false

  opts.collapse = !opts.noExportCollapse
  // opts.extend = !opts.noExportExtend

  // Before adding anything, see if the named exports can be collapsed into the default export.
  if (defaultExport && namedExports.length && opts.collapse) {
    let filteredExports = collapseNamedExports(programNode, defaultExportDeclaration, namedExports, opts)
    if (!filteredExports.length) {
      namedExports = []
    }
    else if (!opts.useTempNameForMixedExports || !opts.allowUnsafeMixedExports) {
      throw new Error(`Unsafe mixing of default and named exports. The following named exports can't be collapsed or ignored: \n(${getPropNames(filteredExports).join(', ')}).`)
    }
  }

  // If the noWrapBeforeImport opt is set, split any code before the first define and afterwards into separate arrays.
  // This should be done before any interops or other vars are injected.
  const preDefine = []
  if (opts.noWrapBeforeImport && firstImport) {
    let reachedFirstImport = false
    const fullBody = body
    const newBody = []
    for (const item of fullBody) {
      if (item === firstImport) {
        reachedFirstImport = true
      }
      if (reachedFirstImport) {
        newBody.push(item)
      }
      else {
        preDefine.push(item)
      }
    }
    if (preDefine.length && !hasUseStrict(programNode)) {
      programNode.directives = [
        t.directive(t.directiveLiteral('use strict')),
        ...(programNode.directives || []),
      ]
    }
    body = newBody
  }

  if (injectDynamicImportHelper) {
    // import() to sap.ui.require() w/ promise and interop
    body.unshift(th.buildDynamicImportHelper())
  }

  if (!namedExports.length && defaultExport) {
    // If there's no named exports, return the default export
    body.push(t.returnStatement(defaultExport))
  }
  else if (namedExports.length) {

    body.push(th.buildDeclareExports()) // i.e. const __exports = {__esModule: true};

    for (const namedExport of namedExports) {
      if (namedExport.all) {
        if (!allExportHelperAdded) {
          body.push(
            th.buildAllExportHelper()
          )
          allExportHelperAdded = true
        }
        body.push(
          th.buildAllExport({
            LOCAL: namedExport.value
          })
        )
      }
      else {
        body.push(
          th.buildNamedExport(namedExport)
        )
      }
    }

    if (defaultExport) {
      body.push(
        th.buildNamedExport({
          key: t.identifier('default'),
          value: defaultExport
        })
      )
    }
    body.push(t.returnStatement(th.exportsIdentifier))
  }

  if (imports.some(imp => imp.interop)) {
    body.unshift(th.buildDefaultImportInterop())
  }

  programNode.body = [
    ...preDefine,
    generateDefine(
      body,
      imports,
      (exportGlobal || opts.exportAllGlobal)
    )
  ]
}

function hasUseStrict(node) {
  return (node.directives || [])
    .some(directive => directive.value.value === 'use strict')
}

function generateDefine(body, imports, exportGlobal) {
  const defineOpts = {
    SOURCES: imports.map(i => t.stringLiteral(i.src)),
    PARAMS: imports.map(i => t.identifier(i.tmpName)),
    BODY: body
  }
  return exportGlobal ? th.buildDefineGlobal(defineOpts) : th.buildDefine(defineOpts)
}
