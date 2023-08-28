import { parse } from "path";

/**
 * Provides the ability to set options per test file or directory.
 */
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
    "class-convert-controller-extension-static-prop-compatibility.controller": {
      overridesToOverride: true,
    },
    "class-convert-all": {
      autoConvertAllExtendClasses: true,
    },
    "class-convert-constructor-move.controller": {
      moveControllerConstructorToOnInit: true,
    },
    "class-convert-constructor-keep-annot.controller": {
      moveControllerConstructorToOnInit: true,
    },
    "import-modules-map": {
      modulesMap: {
        ["@babel/polyfill"]: "./vendor/browser-polyfill",
      },
    },
    "import-modules-map-fn": {
      modulesMap: (src) => Options.files["import-modules-map"].modulesMap[src],
    },
    "ts-class-props-only-move-this": {
      onlyMoveClassPropsUsingThis: true,
    },
    "class-convert-only-move-this-binding": {
      onlyMoveClassPropsUsingThis: true,
    },
  },
  dirs: {
    comments: {
      noWrapBeforeImport: true,
    },
    "min-wrap": {
      noWrapBeforeImport: true,
    },
    "never-use-strict": {
      noWrapBeforeImport: true,
      neverUseStrict: true,
    },
    _private_: {
      noWrapBeforeImport: true,
      moveControllerPropsToOnInit: true,
      addControllerStaticPropsToExtend: true,
    },
    libs: {
      libs: ["^sap/"],
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
