import { parse } from "path";

const Options = {
  default: {
    namespacePrefix: undefined,
    allowUnsafeMixedExports: false,
    noExportCollapse: false,
    noExportExtend: false,
    noImportInteropPrefixes: ["sap/"],
  },
  files: {
    "class-convert-never.controller": {
      neverConvertClass: true,
    },
    "class-controller-w-oninit": {
      moveControllerPropsToOnInit: true,
    },
    "class-controller-wo-oninit": {
      moveControllerPropsToOnInit: true,
    },
    "export-options-global": {
      exportAllGlobal: true,
    },
    "class-convert-controller-extend-static-assign": {
      addControllerStaticPropsToExtend: true,
    },
    "class-convert-controller-extend-static-prop": {
      addControllerStaticPropsToExtend: true,
    },
    "class-convert-all": {
      autoConvertAllExtendClasses: true,
    },
  },
  dirs: {
    "min-wrap": {
      noWrapBeforeImport: true,
    },
    _private_: {
      noWrapBeforeImport: true,
      moveControllerPropsToOnInit: true,
      addControllerStaticPropsToExtend: true,
    },
  },
};

export function get(filePath) {
  const { name, dir: dirPath } = parse(filePath);
  const { base: dir } = parse(dirPath);
  let options = { ...Options.default };
  if (filePath.includes("prefix")) {
    options.namespacePrefix = "prefix";
  }
  const fileOverrides = Options.files[name];
  if (fileOverrides) {
    options = {
      ...options,
      ...fileOverrides,
    };
  }
  const dirOverride = Options.dirs[dir];
  if (dirOverride) {
    options = {
      ...options,
      ...dirOverride,
    };
  }
  return options;
}
