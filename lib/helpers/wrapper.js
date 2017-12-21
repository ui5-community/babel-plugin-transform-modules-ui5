
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
    else if (!opts.allowUnsafeMixedExports) {
      throw new Error(`Unsafe mixing of default and named exports. The following named exports can't be collapsed or ignored: \n(${getPropNames(filteredExports).join(', ')}).`)
    }
  }

  if (injectDynamicImportHelper) {
    body.unshift(th.buildDynamicImportHelper())
  }

  if (!namedExports.length && defaultExport) {
    body.push(t.returnStatement(defaultExport))
  }
  else if (namedExports.length) {

    body.unshift(...[
      th.buildDeclareExports(),
      th.buildExportsModuleDeclaration()
    ])

    for (let namedExport of namedExports) {
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

  // console.log(require('util').inspect(opts, { depth: 2 }));

  const preDefine = [
    // t.directive(t.directiveLiteral('use strict'))
  ]

  if (firstImport && opts.noWrapBeforeImport) {
    let found = false
    const fullBody = body
    body = []
    for (const item of fullBody) {
      // console.log(require('util').inspect(bodyItem, { depth: 3 }));
      if (item === firstImport) {
        found = true
      }
      if (found) {
        body.push(item)
      }
      else {
        preDefine.push(item)
      }
    }
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

function generateDefine(body, imports, exportGlobal) {
  const defineOpts = {
    SOURCES: imports.map(i => t.stringLiteral(i.src)),
    PARAMS: imports.map(i => t.identifier(i.tmpName)),
    BODY: body
  }
  return exportGlobal ? th.buildDefineGlobal(defineOpts) : th.buildDefine(defineOpts)
}
