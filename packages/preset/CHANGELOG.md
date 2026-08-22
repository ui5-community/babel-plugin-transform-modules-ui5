# Change Log

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
