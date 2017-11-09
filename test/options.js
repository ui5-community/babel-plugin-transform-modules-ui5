// @flow
import { parse } from 'path'

const Options = {
  default: {
    namespacePrefix: undefined,
    allowUnsafeMixedExports: false,
    noExportCollapse: false,
    noExportExtend: false,
    noImportInteroptPrefixes: ['sap/'],
  },
  files: {
    'class-convert-options-never': {
      neverConvertClass: true
    },
    'class-convert-options-namedonly': {
      onlyConvertNamedClass: true
    }
  }
}

export function get(filepath: string) {
  const { name } = parse(filepath)
  // const { name, dir: dirpath } = parse(filepath)
  // const { base: dir } = parse(dirpath)
  let options = {...Options.default}
  if (filepath.includes('prefix')) {
    options.namespacePrefix = 'prefix'
  }
  const fileOverrides = Options.files[name]
  if (fileOverrides) {
    options = {
      ...options,
      ...fileOverrides
    }
  }
  return options
}
