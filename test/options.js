// @flow
// import { parse } from 'path'

const Options = {
  default: {
    namespacePrefix: undefined,
    allowUnsafeMixedExports: false,
    noExportCollapse: false,
    noExportExtend: false,
    noImportInteroptPrefixes: ['sap/'],
  },

}

export function get(filepath: string) {
  // const { name, dir: dirpath } = parse(filepath)
  // const { base: dir } = parse(dirpath)
  const options = {...Options.default}
  if (filepath.includes('prefix')) {
    options.namespacePrefix = 'prefix'
  }
  return options
}
