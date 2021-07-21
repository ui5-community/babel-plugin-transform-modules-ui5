#

## CHANGELOG

The major version will be kept the same as babel's (currently 7.x.x).

### 7.0.5 (2021-07-21)

#### Fixes

- #38 / #55 - Fixes sourceRoot resolution

### 7.0.4 (2021-07-03)

#### Fixes

- #52 / #53 - Fixes unknown ExportNamedDeclaration caused by babel 7.14.4

### 7.0.3 (2019-12-03)

#### Fixes

- #26 - `export type` being transpiled, but should be removed
- #27 - super.X.apply not transpiling correctly

### 7.0.2 (2019-08-27)

#### Fixes

- Moving prettier to devDeps and upgrade devDeps

### 7.0.1 (2019-05-31)

#### Fixes

- #24 Use `var` instead of `const` for `__exports` since no other transforms are applied after wrapping.

### 7.0.0 (2019-03-20)

There are no changes between 7.0.0 and 7.0.0-rc.10.

#### Breaking

- #16 Move all instance class props to constructor or onInit by default. Added option `onlyMoveClassPropsUsingThis` for old behaviour.
- Default behaviour is now similar to previous `onlyConvertNamedClass=true`, but also with logic to convert `*.controller.js` classes automatically.
  - Added option `autoConvertAllExtendClasses` to restore version 6 behaviour.
- Added option `autoConvertControllerClass` to disable new `*.controller.js` behaviour (enabled by default)

#### Enhancements

- #16 `modulesMap` option
- #15/#17 Deferred module wrapping to support imports and helpers added by other plugins

#### Fixes

- #18 Better recursive detection of 'this' used on class properties
- #21 Computed class props moved correctly.
- #20 (Typescript) declare the \_\_exports variable for anonymous exports at time of declaration rather than at end of program, so that Typescript plugin can strip types on it.
- Handle @ sign in import names when creating local variable name

### 7.0.0-rc.10 (2019-03-04)

#### Fixes

- #21 Computed class props moved correctly.

### 7.0.0-rc.9 (2019-03-01)

#### Fixes

- #20 (Typescript) declare the \_\_exports variable for anonymous exports at time of declaration rather than at end of program, so that Typescript plugin can strip types on it.

### 7.0.0-rc.8 (2019-02-28)

#### Breaking

- #16 Move all instance class props to constructor or onInit by default. Added option `onlyMoveClassPropsUsingThis` for old behaviour.

### 7.0.0-rc.7 (2019-02-13)

#### Fixes

- #18 Better recursive detection of 'this' used on class properties

### 7.0.0-rc.6 (2019-02-13)

#### Enhancements

- #15/#17 Deferred module wrapping to support imports and helpers added by other plugins

### 7.0.0-rc5 (2019-02-08)

#### Enhancements

- #16 `modulesMap` option

### 7.0.0-rc.4 (2019-02-07)

#### Fixes

- Handle @ sign in import names when creating local variable name

### 7.0.0-rc.3 (2019-02-06)

#### Breaking

- Existing controller constructors are no longer moved to onInit when `moveControllerPropsToOnInit` is set. New property `moveControllerConstructorToOnInit` to get back old behaviour.

### 7.0.0-rc.2 (2019-01-17)

#### Fixes

- Re-add `@namespace` support
- Convert classes when `@controller` annotation found

### 7.0.0-alpha4 (2018-10-12)

- Internal updates

### 7.0.0-alpha3 (2018-10-11)

- Internal updates, and removed peerDependency

### 7.0.0-alpha2 (2018-10-08)

#### Breaking

- Default behaviour is now similar to previous `onlyConvertNamedClass=true`, but also with logic to convert `*.controller.js` classes automatically.
  - Added option `autoConvertAllExtendClasses` to restore version 6 behaviour.

#### Behaviour Change

- Added option `autoConvertControllerClass` to disable new `*.controller.js` behaviour (enabled by default)

### 7.0.0-alpha1 (2018-08-17)

#### Behaviour Change

- Requires babel 7

### 6.18.1 (2018-02-06)

#### Bug Fixes

- Fix Issue #3: Class method conversion can cause conflicts and stack overflow.
- Fix Issue #5: Class prop injected into the controller should go between the super call and other statements.
- Fix Issue #6: Class props using 'this' should be injected into constructor or onInit.

### 6.18.0 (2018-02-06)

#### Behaviour Change

- The import default interop function will now return the object itself if there is no 'default' property on it, even if \_\_esModule is true. Note that interop is still only called when the import code imports default.

### 6.17.2 (2018-02-06)

#### Bug Fixes

- Fix Issue #4: Export named from, having paths with dash cause invalid syntax.

### 6.17.1 (2018-02-06)

#### Bug Fixes

- Fix Issue #4: Import paths with dash cause invalid syntax.

### 6.17.0 (2017-12-29)

#### Features

- Named exports can now be collapsed onto an anonymous default export by using a temporary variable for it.

#### Bug Fixes

- Fix Issue #2: super calls are now transformed using the correct AST (t.thisExpression() vs t.identifier('this')) so they are transformed correctly by arrow function transform.

### 6.16.1 (2017-12-28)

#### Bug Fixes

- Fix Issue #1: Moved logic from `Program.exit` to `Program` so it runs before other plugins added by babel-preset-env such as class properties and class transform.
- Removed t.isImport() since it only exists if the dynamic import plugin was used too.

### 6.16.0 (2017-12-28)

#### Features

- Merge all imports from the same source into a single require and deconstruct from it.

### 6.15.3 (2017-12-21)

#### Bug Fixes

- When using `noWrapBeforeImport`, the interop variables and helpers are now added inside sap.ui.define.
- When using `noWrapBeforeImport`, if any code is added outside sap.ui.define, 'use strict'; is added.

### 6.15.2 (2017-12-21)

#### Bug Fixes

- Fixing 6.15.1

### 6.15.1 (2017-12-20)

#### Bug Fixes

- Using \_\_exports instead of exports in case "use strict"; doesn't get added so exports won't be defined globally.

### 6.15.0 (2017-12-20)

#### Features

- New option and feature `addControllerStaticPropsToExtend`.

### 6.14.1 (2017-12-13)

#### Bug Fixes

- Fix the dynamic import helper by setting \_\_esModule flag.

### 6.14.0 (2017-12-08)

#### Potential Breaking

- Controller onInit logic is now off by default and uses flag moveControllerPropsToOnInit

#### Features

- noWrapBeforeImport functionality (using flag to opt-in)

### 6.13.0 (2017-11-24)

#### Features

- Dynamic import()

### 6.12.0 (2017-11-14)

#### Potential Breaking

- Update the no-wrap logic to just use whether there is an import or export

### 6.11.0 (2017-11-10)

#### Features

- Controller conversion enhancements to move property initialization to onInit rather than the constructor.

### 6.10.1 (2017-11-09)

#### Bug Fixes

- Fix support for assigning named exports to default export when it is a function.

### 6.10.0 (2017-11-09)

#### Features

- Support metadata and renderer static props assigned outside the class (`Class.renderer = {}`)

#### Breaking

- Removed support for defining renderer and metadata variables in JSDoc
