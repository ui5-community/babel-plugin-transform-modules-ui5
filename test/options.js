// @flow
import { parse } from 'path'

const Options = {
  default: {
    namespacePrefix: undefined,
    allowUnsafeMixedExports: false,
    noExportCollapse: false,
    noExportExtend: false,
    noImportInteropPrefixes: ['sap/'],
  },
  files: {
    'class-convert-options-never': {
      neverConvertClass: true
    },
    'class-convert-options-namedonly': {
      onlyConvertNamedClass: true
    },
    'class-controller-w-oninit': {
      moveControllerPropsToOnInit: true
    },
    'class-controller-wo-oninit': {
      moveControllerPropsToOnInit: true
    },
    'export-options-global': {
      exportAllGlobal: true
    }
  },
  dirs: {
    'min-wrap': {
      noWrapBeforeImport: true
    }
  }
}

export function get(filepath: string) {
  const { name, dir: dirpath } = parse(filepath)
  const { base: dir } = parse(dirpath)
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
  const dirOverrride = Options.dirs[dir]
  if (dirOverrride) {
    options = {
      ...options,
      ...dirOverrride
    }
  }
  return options
}
