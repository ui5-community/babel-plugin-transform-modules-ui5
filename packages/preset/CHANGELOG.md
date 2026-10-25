# Change Log

## 7.11.0

### Minor Changes

- [#162](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/pull/162) [`db2ad98`](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/commit/db2ad98648ac7971d7b6cc1264b8d7b32d4b0b56) Thanks [@petermuessig](https://github.com/petermuessig)! - feat: auto-detect UI5 extend-classes by filename suffix and known base-class module paths

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

- [#168](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/pull/168) [`e31c07f`](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/commit/e31c07f2e47478ae77e00e135d60c4c8fb896c88) Thanks [@petermuessig](https://github.com/petermuessig)! - feat: add `@movePropsToConstructor` per-property annotation to opt out of `moveControllerPropsToOnInit` ([#116](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/issues/116))

  When `moveControllerPropsToOnInit` is enabled, individual class properties can be kept in the
  constructor by annotating them with `@movePropsToConstructor` (JSDoc block comment or decorator):

  ```ts
  export default class MyController extends Controller {
    /** Normal prop — moves to onInit as usual */
    prop = 1;

    /**
     * @movePropsToConstructor
     */
    formatter = { formatValue: (v: string) => v }; // stays in constructor

    handler = () => true; // moves to onInit as usual
  }
  ```

### Patch Changes

- [#167](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/pull/167) [`d021d2e`](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/commit/d021d2e6422494931ddeb8944ac443facc2c5e4b) Thanks [@petermuessig](https://github.com/petermuessig)! - fix: avoid crash when a default export uses `Object.assign(Object.create(null), …)` alongside named exports ([#148](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/issues/148))

  `getPropertiesOfObjectAssignOrExtendHelper` no longer leaks `undefined` entries for call-expression arguments
  (e.g. `Object.create(null)`), which previously caused `Cannot read properties of undefined (reading 'key')` during
  export collapsing.

- [#166](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/pull/166) [`506985d`](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/commit/506985d2d5f9004faad9f4cbd9b5e4c04b4bd052) Thanks [@petermuessig](https://github.com/petermuessig)! - fix: handle string-literal import names and object property keys; escape regex metacharacters in noImportInteropPrefixes

  Picks up the still-relevant fixes from PR [#163](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/issues/163) (thanks @mauriciolauffer):

  - Named imports using string-literal specifiers (`import { "some-export" as local } from "mod"`) now produce correct destructure output instead of `undefined`.
  - `noImportInteropPrefixes` entries are now regex-escaped before being embedded in the regexp pattern, preventing metacharacters from acting as wildcards.
  - `getPropNames` and `groupPropertiesByName` in `utils/ast.js` now handle `StringLiteral` property keys in addition to `Identifier` keys.

- Updated dependencies [[`db2ad98`](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/commit/db2ad98648ac7971d7b6cc1264b8d7b32d4b0b56), [`e31c07f`](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/commit/e31c07f2e47478ae77e00e135d60c4c8fb896c88), [`d021d2e`](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/commit/d021d2e6422494931ddeb8944ac443facc2c5e4b), [`506985d`](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/commit/506985d2d5f9004faad9f4cbd9b5e4c04b4bd052)]:
  - babel-plugin-transform-modules-ui5@7.11.0

## 7.10.0

### Minor Changes

- [#154](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/pull/154) [`f62f9fb`](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/commit/f62f9fba1a64dea2673662dd163fcc1eb5cff540) Thanks [@bbogovich-sap](https://github.com/bbogovich-sap)! - Add two comment pragmas to opt out of module transformation:

  - `/* @ui5-no-wrap */` (file level) leaves a module completely unwrapped —
    no `sap.ui.define`/`sap.ui.require` and no import/export rewriting — while
    still stripping TypeScript types. Intended for modules consumed as native
    ES modules, e.g. web workers.
  - `/* @ui5-ignore-import */` (statement level) excludes a single static
    `import` or dynamic `import()` from being converted into a UI5 dependency.

  Note: `@ui5-ignore-import` on a static import only yields valid output in an
  unwrapped module (no exports, or together with `@ui5-no-wrap`); a leftover
  ES `import` inside a `sap.ui.define` factory is not valid at runtime.

### Patch Changes

- Updated dependencies [[`f62f9fb`](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/commit/f62f9fba1a64dea2673662dd163fcc1eb5cff540)]:
  - babel-plugin-transform-modules-ui5@7.10.0

## 7.9.0

### Minor Changes

- [#151](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/pull/151) [`ce059b3`](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/commit/ce059b343a43960de9dca8ef1d19a0ab70c51fde) Thanks [@petermuessig](https://github.com/petermuessig)! - Raise minimum Node.js version to 20.19, refresh dev dependencies, and migrate ESLint to v9 flat config.

  - `engines.node` is now `>=20.19.0` for both packages.
  - ESLint upgraded to 9.x with new `eslint.config.js` (legacy `.eslintrc.js` and `.eslintignore` removed).
  - `eslint-plugin-node` (unmaintained) replaced by `eslint-plugin-n@17`.
  - Removed obsolete dev dependencies: `babel-eslint` (superseded by `@babel/eslint-parser`), `eslint-config-standard`, `eslint-plugin-standard`.
  - Bumped `eslint-config-prettier` to 10.x, `eslint-plugin-prettier` to 5.5.x, `eslint-plugin-promise` to 7.x, `prettier` to 3.8.x, `jest`/`babel-jest` to 30.4.x, `core-js` to 3.49.x.
  - CI matrix updated from Node 18/20/22/24 to 20/22/24.

  No changes to plugin runtime behavior or production dependencies.

### Patch Changes

- [#151](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/pull/151) [`ce059b3`](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/commit/ce059b343a43960de9dca8ef1d19a0ab70c51fde) Thanks [@petermuessig](https://github.com/petermuessig)! - Bump dev-only dependencies to their latest minor releases:

  - `globals` 17.6 → 17.7
  - `prettier` 3.8 → 3.9

  Both stay within the Node 20.19+ support window declared in our Node.js
  support policy. No plugin behavior changes.

- Updated dependencies [[`ce059b3`](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/commit/ce059b343a43960de9dca8ef1d19a0ab70c51fde), [`ce059b3`](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/commit/ce059b343a43960de9dca8ef1d19a0ab70c51fde), [`ce059b3`](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/commit/ce059b343a43960de9dca8ef1d19a0ab70c51fde), [`ce059b3`](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/commit/ce059b343a43960de9dca8ef1d19a0ab70c51fde), [`ce059b3`](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/commit/ce059b343a43960de9dca8ef1d19a0ab70c51fde)]:
  - babel-plugin-transform-modules-ui5@7.9.0

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [7.8.1](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/compare/v7.8.0...v7.8.1) (2025-12-29)

**Note:** Version bump only for package babel-preset-transform-ui5

# [7.8.0](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/compare/v7.7.1...v7.8.0) (2025-09-11)

**Note:** Version bump only for package babel-preset-transform-ui5

## [7.7.1](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/compare/v7.7.0...v7.7.1) (2025-05-13)

**Note:** Version bump only for package babel-preset-transform-ui5

# [7.7.0](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/compare/v7.6.2...v7.7.0) (2024-09-16)

### Features

- update dependencies / add peer dependency to @babel/core ([#135](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/issues/135)) ([d155e48](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/commit/d155e48a4a3737ebcf4a7e77318391bbce783e70)), closes [#133](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/issues/133)

## [7.6.2](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/compare/v7.6.1...v7.6.2) (2024-09-14)

**Note:** Version bump only for package babel-preset-transform-ui5

## [7.6.1](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/compare/v7.6.0...v7.6.1) (2024-09-13)

**Note:** Version bump only for package babel-preset-transform-ui5

# [7.6.0](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/compare/v7.5.0...v7.6.0) (2024-07-22)

**Note:** Version bump only for package babel-preset-transform-ui5

# [7.5.0](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/compare/v7.4.2...v7.5.0) (2024-07-12)

**Note:** Version bump only for package babel-preset-transform-ui5

## [7.4.2](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/compare/v7.4.1...v7.4.2) (2024-06-25)

**Note:** Version bump only for package babel-preset-transform-ui5

## [7.4.1](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/compare/v7.4.0...v7.4.1) (2024-06-02)

**Note:** Version bump only for package babel-preset-transform-ui5

# [7.4.0](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/compare/v7.3.1...v7.4.0) (2024-05-31)

**Note:** Version bump only for package babel-preset-transform-ui5

## [7.3.1](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/compare/v7.3.0...v7.3.1) (2024-05-12)

**Note:** Version bump only for package babel-preset-transform-ui5

# [7.3.0](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/compare/v7.2.6...v7.3.0) (2024-01-18)

**Note:** Version bump only for package babel-preset-transform-ui5

## [7.2.6](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/compare/v7.2.5...v7.2.6) (2023-11-23)

**Note:** Version bump only for package babel-preset-transform-ui5

## [7.2.5](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/compare/v7.2.4...v7.2.5) (2023-08-28)

**Note:** Version bump only for package babel-preset-transform-ui5

## [7.2.4](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/compare/v7.2.3...v7.2.4) (2023-07-20)

**Note:** Version bump only for package babel-preset-transform-ui5

## [7.2.3](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/compare/v7.2.2...v7.2.3) (2023-07-18)

**Note:** Version bump only for package babel-preset-transform-ui5

## [7.2.2](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/compare/v7.2.1...v7.2.2) (2023-07-18)

**Note:** Version bump only for package babel-preset-transform-ui5

## [7.2.1](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/compare/v7.2.0...v7.2.1) (2023-06-13)

**Note:** Version bump only for package babel-preset-transform-ui5

# [7.2.0](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/compare/v7.1.5...v7.2.0) (2023-05-30)

### Features

- split class conversion to enable other Babel plugin conversion ([#100](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/issues/100)) ([4ba096b](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/commit/4ba096b1a24d807cda2fd2f57425f3ab4b91a31b)), closes [#23](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/issues/23) [#25](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/issues/25)

## [7.1.5](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/compare/v7.1.4...v7.1.5) (2023-05-30)

**Note:** Version bump only for package babel-preset-transform-ui5

## [7.1.4](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/compare/v7.1.3...v7.1.4) (2023-04-11)

**Note:** Version bump only for package babel-preset-transform-ui5

## [7.1.3](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/compare/v7.1.2...v7.1.3) (2023-04-11)

**Note:** Version bump only for package babel-preset-transform-ui5

## [7.1.2](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/compare/v7.1.1...v7.1.2) (2023-04-11)

**Note:** Version bump only for package babel-preset-transform-ui5

## [7.1.1](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/compare/v7.1.0...v7.1.1) (2023-03-27)

**Note:** Version bump only for package babel-preset-transform-ui5

# [7.1.0](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/compare/v7.0.6...v7.1.0) (2023-03-13)

**Note:** Version bump only for package babel-preset-transform-ui5

## [7.0.6](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/compare/v7.0.5...v7.0.6) (2023-02-21)

**Note:** Version bump only for package babel-preset-transform-ui5
