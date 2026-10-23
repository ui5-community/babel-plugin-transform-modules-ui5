import { parse, resolve } from "path";

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
    "class-convert-known-ui5-classes": {
      autoConvertKnownUI5Classes: true,
    },
    "class-convert-known-ui5-classes-disabled": {
      autoConvertKnownUI5Classes: false,
    },
    "class-convert-additional-ui5-classes": {
      additionalUI5Classes: ["my/app/BaseController"],
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
    "SiblingSourcerootApp": {
      autoConvertKnownUI5Classes: true,
    },
    "SourceFolderApp.controller": {
      autoConvertKnownUI5Classes: true,
      sourceFolders: { src: "my.app" },
    },
    "UnmatchedFolderApp": {
      autoConvertKnownUI5Classes: true,
      sourceFolders: { src: "my.app" }, // "other" is not mapped → empty namespace → no auto-convert
    },
    "error-noextend-mixed-exports": {
      noExportExtend: true,
    },
    "import-remove-fileext-suppressed": {
      suppressImportResolutionHints: true,
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
    "class-convert-transitive-ui5-classes": {
      autoConvertKnownUI5Classes: true,
    },
    "class-convert-transitive-default-export-nonui5": {
      autoConvertKnownUI5Classes: true,
    },
    "class-convert-transitive-reverse-order": {
      autoConvertKnownUI5Classes: true,
    },
    "class-convert-known-ui5-classes-no-namespace": {
      autoConvertKnownUI5Classes: true,
    },
    "class-convert-transitive-renamed-import": {
      autoConvertKnownUI5Classes: true,
    },
    "class-convert-transitive-explicit-ext": {
      autoConvertKnownUI5Classes: true,
    },
    "class-convert-transitive-identifier-default-export": {
      autoConvertKnownUI5Classes: true,
    },
    "class-convert-transitive-ts-ancestor": {
      autoConvertKnownUI5Classes: true,
    },
    "class-convert-transitive-default-alias-collision": {
      autoConvertKnownUI5Classes: true,
    },
    "class-convert-transitive-no-super-default-collision": {
      autoConvertKnownUI5Classes: true,
    },
    "class-convert-transitive-named-export-default": {
      autoConvertKnownUI5Classes: true,
    },
  },
  // Babel-level option overrides keyed by file/dir name.
  // Use sparingly — only when the test needs a different sourceRoot than __dirname.
  babelOpts: {
    "class-convert-known-ui5-classes-no-namespace": {
      // Point sourceRoot to the fixture dir itself so the file's dir resolves to ""
      // and fileNamespace becomes "" — triggering the namespace guard, which prevents
      // autoConvertKnownUI5Classes from converting the class.
      sourceRoot: resolve(
        __dirname,
        "fixtures/classes/class-convert-known-ui5-classes-no-namespace"
      ),
    },
    "SiblingSourcerootApp": {
      // Point sourceRoot at the fixture root so SiblingSourcerootApp.js (in app/) has a
      // non-empty namespace ("app") and reaches the transitive known-class branch, while
      // its ancestor Base.js lives in a SIBLING dir (".../-legacy") that shares sourceRoot
      // as a string prefix but is NOT contained in it. Exercises the Path.relative
      // containment check: the sibling must be treated as outside sourceRoot.
      sourceRoot: resolve(
        __dirname,
        "fixtures/classes/class-convert-transitive-sibling-sourceroot"
      ),
    },
    "SourceFolderApp.controller": {
      // Point sourceRoot at the fixture root so the file's leading folder is "src"
      // (matching the sourceFolders key) rather than "fixtures".
      sourceRoot: resolve(
        __dirname,
        "fixtures/classes/class-convert-source-folders"
      ),
    },
    "UnmatchedFolderApp": {
      // Point sourceRoot at the fixture root so the file's leading folder is "other"
      // (NOT a key in sourceFolders: { src: "my.app" }) → empty namespace → no auto-convert.
      sourceRoot: resolve(
        __dirname,
        "fixtures/classes/class-convert-source-folders-unmatched"
      ),
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

export function getBabelOpts(filePath) {
  const { name, dir: dirPath } = parse(filePath);
  const { base: dir } = parse(dirPath);
  return Options.babelOpts[name] || Options.babelOpts[dir] || {};
}
