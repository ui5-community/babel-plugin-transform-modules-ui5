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
    "class-convert-known-ui5-classes-named-import": {
      autoConvertKnownUI5Classes: true,
      namespacePrefix: "my.app",
    },
    "class-convert-known-ui5-classes-disabled": {
      autoConvertKnownUI5Classes: false,
    },
    "class-convert-additional-ui5-classes": {
      additionalUI5Classes: ["my/app/BaseController"],
    },
    "class-no-convert-controller-opt-out.controller": {
      autoConvertControllerClass: false,
    },
    "class-no-convert-view-opt-out.view": {
      autoConvertViewClass: false,
    },
    "LocalMid": {
      // Middle ancestor in the N2 rejection chain — lives in "other/" which is not mapped
      // in sourceFolders, so it gets no namespace and should NOT be converted.
      autoConvertKnownUI5Classes: true,
      sourceFolders: { src: "my.app" },
    },
    "MyApp": {
      // Top of the N2 rejection chain — "src/" is mapped, giving it a namespace, but its
      // intermediate ancestor LocalMid has no namespace, so isLocalChainConvertible returns
      // false and MyApp must also NOT be converted.
      autoConvertKnownUI5Classes: true,
      sourceFolders: { src: "my.app" },
    },
    "class-convert-constructor-move.controller": {
      moveControllerConstructorToOnInit: true,
    },
    "class-convert-constructor-keep-annot.controller": {
      moveControllerConstructorToOnInit: true,
    },
    "class-convert-controller-detect-by-filename.controller": {
      moveControllerPropsToOnInit: true,
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
    "DepMappedApp.controller": {
      autoConvertKnownUI5Classes: true,
      dependencies: [
        {
          sourceRoot: resolve(
            __dirname,
            "fixtures/classes/class-convert-dependencies/dep-lib"
          ),
          sourceFolders: { src: "my.dep" },
        },
      ],
    },
    "DepUnmappedApp": {
      autoConvertKnownUI5Classes: true,
      dependencies: [
        {
          sourceRoot: resolve(
            __dirname,
            "fixtures/classes/class-convert-dependencies/dep-lib"
          ),
          sourceFolders: { src: "my.dep" },
        },
      ],
    },
    "PrimaryExtendsDepBase": {
      autoConvertKnownUI5Classes: true,
      sourceFolders: { src: "my.app" },
      dependencies: [
        {
          sourceRoot: resolve(
            __dirname,
            "fixtures/classes/class-convert-dependencies/dep-lib"
          ),
          sourceFolders: { src: "my.dep" },
        },
      ],
    },
    "PrimaryExtendsDepBaseModulePath": {
      autoConvertKnownUI5Classes: true,
      sourceFolders: { src: "my.app" },
      dependencies: [
        {
          sourceRoot: resolve(
            __dirname,
            "fixtures/classes/class-convert-dependencies/dep-lib"
          ),
          sourceFolders: { src: "my.dep" },
        },
      ],
    },
    "PrimaryExtendsDepBaseUnmapped": {
      autoConvertKnownUI5Classes: true,
      sourceFolders: { src: "my.app" },
      dependencies: [
        {
          sourceRoot: resolve(
            __dirname,
            "fixtures/classes/class-convert-dependencies/dep-lib"
          ),
          sourceFolders: { src: "my.dep" }, // "other" is not mapped → dep ancestor not found → no auto-convert
        },
      ],
    },
    "DepBase": {
      autoConvertKnownUI5Classes: true,
      sourceFolders: { src: "my.dep" },
    },
    "error-noextend-mixed-exports": {
      noExportExtend: true,
    },
    "import-remove-fileext-suppressed": {
      suppressImportResolutionHints: true,
    },
    "EmptyPrefixBase": {
      autoConvertKnownUI5Classes: true,
      sourceFolders: { src: "" }, // empty-string mapping → "src" stripped, no prefix prepended
    },
    "EmptyPrefixApp": {
      autoConvertKnownUI5Classes: true,
      sourceFolders: { src: "" },
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
    "class-convert-transitive-no-super-default-mid": {
      // namespacePrefix gives ZChild and GrandChild a non-empty namespace so the namespace
      // guard passes and isLocalChainConvertible is exercised. MixedMid has an explicit
      // default export (AppBase, no superclass) plus a sibling UI5 Helper — the
      // filesWithDefaultExport guard must block the key-scan fallback so neither ZChild nor
      // GrandChild is converted.
      autoConvertKnownUI5Classes: true,
      namespacePrefix: "my.app",
    },
    "class-convert-transitive-named-export-default": {
      autoConvertKnownUI5Classes: true,
    },
    "class-convert-transitive-named-import-alias": {
      autoConvertKnownUI5Classes: true,
    },
    "class-convert-transitive-controller-flag": {
      autoConvertKnownUI5Classes: true,
      moveControllerConstructorToOnInit: true,
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
    "DepMappedApp.controller": {
      // Primary sourceRoot is <fixture-root>/primary — file lives in dep-lib, so it is
      // outside the primary root. The dependencies option points to dep-lib so the plugin
      // can derive the namespace "my.dep.controller" from there.
      sourceRoot: resolve(
        __dirname,
        "fixtures/classes/class-convert-dependencies/primary"
      ),
    },
    "DepUnmappedApp": {
      // Same primary sourceRoot as DepMappedApp.controller, but the dep-lib sub-folder
      // "other" is not mapped in dep.sourceFolders → empty namespace → no auto-convert.
      sourceRoot: resolve(
        __dirname,
        "fixtures/classes/class-convert-dependencies/primary"
      ),
    },
    "DepBase": {
      // DepBase.js lives in dep-lib/src/base/. Point sourceRoot at dep-lib so the FQN
      // resolves to "my.dep.base.DepBase" via dep-level sourceFolders { src: "my.dep" }.
      sourceRoot: resolve(
        __dirname,
        "fixtures/classes/class-convert-dependencies/dep-lib"
      ),
    },
    "PrimaryExtendsDepBase": {
      // Primary sourceRoot is <fixture-root>/primary; sourceFolders maps "src" → "my.app".
      // The dep ancestor (DepBase.js) lives in dep-lib, outside the primary root.
      // This exercises the N2 cross-root ancestor namespace check.
      sourceRoot: resolve(
        __dirname,
        "fixtures/classes/class-convert-dependencies/primary"
      ),
    },
    "PrimaryExtendsDepBaseModulePath": {
      // Same primary sourceRoot as PrimaryExtendsDepBase but the ancestor is imported
      // via UI5 module path "my/dep/base/DepBase" rather than a relative path.
      // Exercises the dep-sourceRoot loop added to resolveImportSourceToFilename.
      sourceRoot: resolve(
        __dirname,
        "fixtures/classes/class-convert-dependencies/primary"
      ),
    },
    "PrimaryExtendsDepBaseUnmapped": {
      // Dep ancestor path "my/dep/other/DepBaseUnmapped" has "other" as its folder,
      // which is NOT in dep.sourceFolders { src: "my.dep" } → resolver can't find it
      // → no transitive match → class stays unconverted.
      sourceRoot: resolve(
        __dirname,
        "fixtures/classes/class-convert-dependencies/primary"
      ),
    },
    "class-convert-transitive-no-ns-mid": {
      // Point sourceRoot at the fixture root so "src" and "other" are the leading folders.
      // "src" is mapped in sourceFolders → namespace "my.app.*"; "other" is not mapped → no namespace.
      // MyApp.js (in src/) must NOT be converted: isLocalChainConvertible rejects the chain because
      // LocalMid (in other/) has no namespace and is not a .controller.js file.
      sourceRoot: resolve(
        __dirname,
        "fixtures/classes/class-convert-transitive-no-ns-mid"
      ),
    },
    "LocalMid": {
      sourceRoot: resolve(
        __dirname,
        "fixtures/classes/class-convert-transitive-no-ns-mid"
      ),
    },
    "MyApp": {
      sourceRoot: resolve(
        __dirname,
        "fixtures/classes/class-convert-transitive-no-ns-mid"
      ),
    },
    "class-convert-source-folders-empty-mapping": {
      // Point sourceRoot at the fixture root so the file's leading folder is "src"
      // (matched in sourceFolders: { src: "" }) rather than "fixtures".
      sourceRoot: resolve(
        __dirname,
        "fixtures/classes/class-convert-source-folders-empty-mapping"
      ),
    },
    "EmptyPrefixBase": {
      sourceRoot: resolve(
        __dirname,
        "fixtures/classes/class-convert-source-folders-empty-mapping"
      ),
    },
    "EmptyPrefixApp": {
      sourceRoot: resolve(
        __dirname,
        "fixtures/classes/class-convert-source-folders-empty-mapping"
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
