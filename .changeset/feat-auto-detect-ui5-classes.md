---
"babel-plugin-transform-modules-ui5": minor
"babel-preset-transform-ui5": minor
---

feat: auto-detect UI5 extend-classes by filename suffix and known base-class module paths

## What's new

- **Auto-detection by known UI5 base classes**: Classes extending from known UI5 base-class module paths (e.g. `sap/ui/core/mvc/Controller`, `sap/ui/core/Control`, `sap/ui/base/ManagedObject`) are automatically converted to `.extend()` syntax without requiring explicit `@alias` or `@namespace` annotations. Controlled by new `autoConvertKnownUI5Classes` option (defaults to true).

- **Transitive inheritance resolution**: Auto-detection walks the superclass chain through local files (order-independent via on-demand ancestor reading from disk) and detects UI5 ancestry even through multiple levels of custom base classes.

- **File-type suffix detection**: New `autoConvertUI5FileTypes` option detects and converts classes based on filename patterns (`.controller.js|ts` and `.view.js|ts|jsx|tsx`). Controllers preserve legacy behavior (no namespace required). Views require a resolvable namespace.

- **Custom base-class paths**: New `additionalUI5Classes` option allows registering project-specific base-class module paths for auto-detection, supplementing the built-in UI5 class list.

- **Cycle detection**: Inheritance chain walking correctly handles cycles (A extends B extends A) via visited-set tracking instead of depth limits.

- **Watch-mode cache fixes**: Fixed stale cache entries persisting across rebuilds when files are renamed or deleted mid-watch. The `importDeclarations` cache entry is now cleared (not just overwritten) during re-processing.

- **Unmatched path warnings**: Added `console.warn` diagnostic when `additionalUI5Classes` paths are configured but never matched by any import in the build, helping catch typos and misconfigurations.

## Breaking changes

None. All new features are opt-in or preserve existing behavior.

**Internal API note:** `getImportDeclaration` (in `src/classes/helpers/imports.js`) now matches
`import { Foo as Bar }` by the _local_ binding name (`Bar`) rather than the _imported_ name (`Foo`).
This is the correct semantics — callers always pass the name as it appears at the use site — but if
you maintain a fork or plugin that calls this helper directly by the imported name, update those call
sites to pass the local name instead.
