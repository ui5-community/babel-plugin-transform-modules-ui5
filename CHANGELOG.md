# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [7.4.2](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/compare/v7.4.1...v7.4.2) (2024-06-25)


### Bug Fixes

* remove mandatory ESM file extensions from sap.ui.define imports ([#129](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/issues/129)) ([571dfa1](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/commit/571dfa192984c9838c573909546b42a85b71e5b6))





## [7.4.1](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/compare/v7.4.0...v7.4.1) (2024-06-02)


### Bug Fixes

* ensure to remove file ext .js only from module path ([#127](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/issues/127)) ([c6afb92](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/commit/c6afb92c2f758a245086baa6f77d3274bb4e5466))





# [7.4.0](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/compare/v7.3.1...v7.4.0) (2024-05-31)


### Bug Fixes

* remove empty export declaration added by TypeScript ([3cb14cf](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/commit/3cb14cf7aefd400d0191d364f457c66452edc32a)), closes [/github.com/babel/babel/blob/main/packages/babel-plugin-transform-typescript/src/index.ts#L399](https://github.com//github.com/babel/babel/blob/main/packages/babel-plugin-transform-typescript/src/index.ts/issues/L399)


### Features

* imports added by other plugins are also included in the sap.ui.define calls ([#126](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/issues/126)) ([895fe62](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/commit/895fe624df66a6db1b9daa5cadce8a984ced5af4))





## [7.3.1](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/compare/v7.3.0...v7.3.1) (2024-05-12)


### Bug Fixes

* remove file extensions from imports to avoid redundant extensions ([#125](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/issues/125)) ([e86d6f6](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/commit/e86d6f675451b6eaaaf63f9433200cd7406d0245))
* support index modules for dependencies ([#123](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/issues/123)) ([f510380](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/commit/f510380f7c201d9aba3e735badea21546f81f03d))





# [7.3.0](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/compare/v7.2.6...v7.3.0) (2024-01-18)


### Bug Fixes

* sanitize variable names for re-exports ([#122](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/issues/122)) ([f475dbc](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/commit/f475dbcb4f8b767a5680a974903e7f97df8dacc7))


### Features

* support using predefined controller extensions ([#120](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/issues/120)) ([d7cb66c](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/commit/d7cb66cd5af422529bb00658669e595af2477615))





## [7.2.6](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/compare/v7.2.5...v7.2.6) (2023-11-23)


### Bug Fixes

* preserve comments for class members ([#117](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/issues/117)) ([b5329cb](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/commit/b5329cb80ea0cade6b85fd1d802befa0bc36fe52))





## [7.2.5](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/compare/v7.2.4...v7.2.5) (2023-08-28)


### Bug Fixes

* by default add "use strict" directive to sap.ui.define ([#115](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/issues/115)) ([7d55cc6](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/commit/7d55cc6126258b60728a00f4070ed19b8ffe9339)), closes [#113](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/issues/113)





## [7.2.4](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/compare/v7.2.3...v7.2.4) (2023-07-20)


### Bug Fixes

* ensure template to be ES5 compliant ([#111](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/issues/111)) ([16819bc](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/commit/16819bc91ce1942e0968a0f7efaa4e7cf767b665))





## [7.2.3](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/compare/v7.2.2...v7.2.3) (2023-07-18)


### Bug Fixes

* copyright comment must be appended as leading comment to file ([#108](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/issues/108)) ([8194671](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/commit/81946714f1d48c82a6609ec3fc1c820e5fff9e51))





## [7.2.2](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/compare/v7.2.1...v7.2.2) (2023-07-18)


### Bug Fixes

* ensure copyright to be kept after typescript processing ([#107](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/issues/107)) ([da9aa69](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/commit/da9aa69c94017e085d7f5a22abde04b123d9307d))





## [7.2.1](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/compare/v7.2.0...v7.2.1) (2023-06-13)


### Bug Fixes

* add support for import.meta.url|resolve ([#106](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/issues/106)) ([afb1e6d](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/commit/afb1e6daa0fcc9896fd184ac9d66990d0a29214a)), closes [#103](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/issues/103)
* support for anonymous classes ([#105](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/issues/105)) ([64773d1](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/commit/64773d180bf65e544806b9f04b7334cd76831b3d)), closes [#104](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/issues/104)





# [7.2.0](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/compare/v7.1.5...v7.2.0) (2023-05-30)


### Features

* split class conversion to enable other Babel plugin conversion ([#100](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/issues/100)) ([4ba096b](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/commit/4ba096b1a24d807cda2fd2f57425f3ab4b91a31b)), closes [#23](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/issues/23) [#25](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/issues/25)





## [7.1.5](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/compare/v7.1.4...v7.1.5) (2023-05-30)


### Bug Fixes

* enable support for TS param props ([#99](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/issues/99)) ([2119b41](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/commit/2119b41fbd5fb41ade7e096190cbebad03eecf7c)), closes [#65](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/issues/65)
* ensure copyright comments to be leading comments ([#97](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/issues/97)) ([39ab194](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/commit/39ab1946f08d3fc33609bd6b9ac6cda9a985c5d7))
* sap.ui.define without callback function ([#98](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/issues/98)) ([c1cd6a8](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/commit/c1cd6a8f158de9b5036d9c768c48972d66ae20aa)), closes [#50](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/issues/50)





## [7.1.4](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/compare/v7.1.3...v7.1.4) (2023-04-11)


### Bug Fixes

* properly handle dynamic import of non-existing modules ([#94](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/issues/94)) ([c443b36](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/commit/c443b36d5035d2e2fa367e074d0732336af8eb78))





## [7.1.3](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/compare/v7.1.2...v7.1.3) (2023-04-11)


### Bug Fixes

* dynamic import must not handle __esModule flagged modules ([#93](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/issues/93)) ([b269985](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/commit/b26998540cac0c2c2868bd59198d6f9abfaab8f7))





## [7.1.2](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/compare/v7.1.1...v7.1.2) (2023-04-11)


### Bug Fixes

* dynamic imports of empty modules must not fail ([#92](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/issues/92)) ([a1de75d](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/commit/a1de75dcfcb577bf6fea3669cf448e9183b7d636))





## [7.1.1](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/compare/v7.1.0...v7.1.1) (2023-03-27)


### Bug Fixes

* catch err for dynamic import to sap.ui.require ([#91](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/issues/91)) ([9c7d26e](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/commit/9c7d26e6aeebc77f5d8faec941fbd994b77de222))





# [7.1.0](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/compare/v7.0.6...v7.1.0) (2023-03-13)


### Features

* backward compatibility for overrides (overridesToOverride option) ([dac96e6](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/commit/dac96e685548ccf831893c03e083e6db2dae3d4f))





The major version will be kept the same as babel's (currently 7.x.x).

## [7.0.6](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/compare/v7.0.5...v7.0.6) (2023-02-21)

### Features

- #82 - Add "overrides" to static props which go into the `extend(...)` settings object

### Fixes

- #80 / #81 - Make noWrapBeforeImport work also with no deconstructors

## [7.0.5](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/compare/v7.0.4...v7.0.5) (2021-07-21)

### Fixes

- #38 / #55 - Fixes sourceRoot resolution

## [7.0.4](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/compare/v7.0.3...v7.0.4) (2021-07-03)

### Fixes

- #52 / #53 - Fixes unknown ExportNamedDeclaration caused by babel 7.14.4

## [7.0.3](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/compare/v7.0.2...v7.0.3) (2019-12-03)

### Fixes

- #26 - `export type` being transpiled, but should be removed
- #27 - super.X.apply not transpiling correctly

## [7.0.2](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/compare/v7.0.1...v7.0.2) (2019-08-27)

### Fixes

- Moving prettier to devDeps and upgrade devDeps

## [7.0.1](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/compare/v7.0.0...v7.0.1) (2019-05-31)

### Fixes

- #24 Use `var` instead of `const` for `__exports` since no other transforms are applied after wrapping.

## [7.0.0](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/compare/v7.0.0-rc.10...v7.0.0) (2019-03-20)

### Breaking

- #16 Move all instance class props to constructor or onInit by default. Added option `onlyMoveClassPropsUsingThis` for old behaviour.
- Default behaviour is now similar to previous `onlyConvertNamedClass=true`, but also with logic to convert `*.controller.js` classes automatically.
  - Added option `autoConvertAllExtendClasses` to restore version 6 behaviour.
- Added option `autoConvertControllerClass` to disable new `*.controller.js` behaviour (enabled by default)

### Enhancements

- #16 `modulesMap` option
- #15/#17 Deferred module wrapping to support imports and helpers added by other plugins

### Fixes

- #18 Better recursive detection of 'this' used on class properties
- #21 Computed class props moved correctly.
- #20 (Typescript) declare the \_\_exports variable for anonymous exports at time of declaration rather than at end of program, so that Typescript plugin can strip types on it.
- Handle @ sign in import names when creating local variable name

## [7.0.0-rc.10](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/compare/v7.0.0-rc.9...v7.0.0-rc.10) (2019-03-04)

### Fixes

- #21 Computed class props moved correctly.

## [7.0.0-rc.9](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/compare/v7.0.0-rc.8...v7.0.0-rc.9) (2019-03-01)

### Fixes

- #20 (Typescript) declare the \_\_exports variable for anonymous exports at time of declaration rather than at end of program, so that Typescript plugin can strip types on it.

## [7.0.0-rc.8](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/compare/v7.0.0-rc.7...v7.0.0-rc.8) (2019-02-28)

### Breaking

- #16 Move all instance class props to constructor or onInit by default. Added option `onlyMoveClassPropsUsingThis` for old behaviour.

## [7.0.0-rc.7](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/compare/v7.0.0-rc.6...v7.0.0-rc.7) (2019-02-13)

### Fixes

- #18 Better recursive detection of 'this' used on class properties

## [7.0.0-rc.6](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/compare/v7.0.0-rc.5...v7.0.0-rc.6) (2019-02-13)

### Enhancements

- #15/#17 Deferred module wrapping to support imports and helpers added by other plugins

## [7.0.0-rc.5](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/compare/v7.0.0-rc.4...v7.0.0-rc.5) (2019-02-08)

### Enhancements

- #16 `modulesMap` option

## [7.0.0-rc.4](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/compare/v7.0.0-rc.3...v7.0.0-rc.4) (2019-02-07)

### Fixes

- Handle @ sign in import names when creating local variable name

## [7.0.0-rc.3](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/compare/v7.0.0-rc.2...v7.0.0-rc.3) (2019-02-06)

### Breaking

- Existing controller constructors are no longer moved to onInit when `moveControllerPropsToOnInit` is set. New property `moveControllerConstructorToOnInit` to get back old behaviour.

## [7.0.0-rc.2](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/compare/v7.0.0-alpha4...v7.0.0-rc.2) (2019-01-17)

### Fixes

- Re-add `@namespace` support
- Convert classes when `@controller` annotation found

## [7.0.0-alpha4](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/compare/v7.0.0-alpha3...v7.0.0-alpha4) (2018-10-12)

- Internal updates

## [7.0.0-alpha3](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/compare/v7.0.0-alpha2...v7.0.0-alpha3) (2018-10-11)

- Internal updates, and removed peerDependency

## [7.0.0-alpha2](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/compare/v7.0.0-alpha1...v7.0.0-alpha2) (2018-10-08)

### Breaking

- Default behaviour is now similar to previous `onlyConvertNamedClass=true`, but also with logic to convert `*.controller.js` classes automatically.
  - Added option `autoConvertAllExtendClasses` to restore version 6 behaviour.

### Behaviour Change

- Added option `autoConvertControllerClass` to disable new `*.controller.js` behaviour (enabled by default)

## [7.0.0-alpha1](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/compare/v6.18.1...v7.0.0-alpha1) (2018-08-17)

### Behaviour Change

- Requires babel 7

## [6.18.1](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/compare/v6.18.0...v6.18.1) (2018-02-06)

### Bug Fixes

- Fix Issue #3: Class method conversion can cause conflicts and stack overflow.
- Fix Issue #5: Class prop injected into the controller should go between the super call and other statements.
- Fix Issue #6: Class props using 'this' should be injected into constructor or onInit.

## [6.18.0](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/compare/v6.17.2...v6.18.0) (2018-02-06)

### Behaviour Change

- The import default interop function will now return the object itself if there is no 'default' property on it, even if \_\_esModule is true. Note that interop is still only called when the import code imports default.

## [6.17.2](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/compare/v6.17.1...v6.17.2) (2018-02-06)

### Bug Fixes

- Fix Issue #4: Export named from, having paths with dash cause invalid syntax.

## [6.17.1](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/compare/v6.17.0...v6.17.1) (2018-02-06)

### Bug Fixes

- Fix Issue #4: Import paths with dash cause invalid syntax.

## [6.17.0](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/compare/v6.16.1...v6.17.0) (2017-12-29)

### Features

- Named exports can now be collapsed onto an anonymous default export by using a temporary variable for it.

### Bug Fixes

- Fix Issue #2: super calls are now transformed using the correct AST (t.thisExpression() vs t.identifier('this')) so they are transformed correctly by arrow function transform.

## [6.16.1](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/compare/v6.16.0...v6.16.1) (2017-12-28)

### Bug Fixes

- Fix Issue #1: Moved logic from `Program.exit` to `Program` so it runs before other plugins added by babel-preset-env such as class properties and class transform.
- Removed t.isImport() since it only exists if the dynamic import plugin was used too.

## [6.16.0](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/compare/v6.15.3...v6.16.0) (2017-12-28)

### Features

- Merge all imports from the same source into a single require and deconstruct from it.

## [6.15.3](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/compare/v6.15.2...v6.15.3) (2017-12-21)

### Bug Fixes

- When using `noWrapBeforeImport`, the interop variables and helpers are now added inside sap.ui.define.
- When using `noWrapBeforeImport`, if any code is added outside sap.ui.define, 'use strict'; is added.

## [6.15.2](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/compare/v6.15.1...v6.15.2) (2017-12-21)

### Bug Fixes

- Fixing 6.15.1

## [6.15.1](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/compare/v6.15.0...v6.15.1) (2017-12-20)

### Bug Fixes

- Using \_\_exports instead of exports in case "use strict"; doesn't get added so exports won't be defined globally.

## [6.15.0](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/compare/v6.14.1...v6.15.0) (2017-12-20)

### Features

- New option and feature `addControllerStaticPropsToExtend`.

## [6.14.1](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/compare/v6.14.0...v6.14.1) (2017-12-13)

### Bug Fixes

- Fix the dynamic import helper by setting \_\_esModule flag.

## [6.14.0](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/compare/v6.13.0...v6.14.0) (2017-12-08)

### Potential Breaking

- Controller onInit logic is now off by default and uses flag moveControllerPropsToOnInit

### Features

- noWrapBeforeImport functionality (using flag to opt-in)

## [6.13.0](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/compare/v6.12.0...v6.13.0) (2017-11-24)

### Features

- Dynamic import()

## [6.12.0](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/compare/v6.11.0...v6.12.0) (2017-11-14)

### Potential Breaking

- Update the no-wrap logic to just use whether there is an import or export

## [6.11.0](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/compare/v6.10.1...v6.11.0) (2017-11-10)

### Features

- Controller conversion enhancements to move property initialization to onInit rather than the constructor.

## [6.10.1](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/compare/v6.10.0...v6.10.1) (2017-11-09)

### Bug Fixes

- Fix support for assigning named exports to default export when it is a function.

## [6.10.0](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/compare/v6.9.0...v6.10.0) (2017-11-09)

### Features

- Support metadata and renderer static props assigned outside the class (`Class.renderer = {}`)

### Breaking

- Removed support for defining renderer and metadata variables in JSDoc
