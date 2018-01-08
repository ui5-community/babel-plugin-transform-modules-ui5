
The major version will be kept the same as babel's (currently 6.x.x).

### 6.17.0 (2017-12-29)

#### Features

* Named exports can now be collapsed onto an anonymous default export by using a temporary variable for it.

#### Bug Fixes

* Fix Issue #2: super calls are now transformed using the correct AST (t.thisExpression() vs t.identifier('this')) so they are transformed correctly by arrow function transform.

### 6.16.1 (2017-12-28)

#### Bug Fixes

* Fix Issue #1: Moved logic from `Program.exit` to `Program` so it runs before other plugins added by babel-preset-env such as class properties and class transform.
* Removed t.isImport() since it only exists if the dynamic import plugin was used too.

### 6.16.0 (2017-12-28)

#### Features

* Merge all imports from the same source into a single require and deconstruct from it.

### 6.15.3 (2017-12-21)

#### Bug Fixes

* When using `noWrapBeforeImport`, the interop variables and helpers are now added inside sap.ui.define.
* When using `noWrapBeforeImport`, if any code is added outside sap.ui.define, 'use strict'; is added.

### 6.15.2 (2017-12-21)

#### Bug Fixes

* Fixing 6.15.1

### 6.15.1 (2017-12-20)

#### Bug Fixes

* Using __exports instead of exports in case "use strict"; doesn't get added so exports won't be defined globally.

### 6.15.0 (2017-12-20)

#### Features

* New option and feature `addControllerStaticPropsToExtend`.

### 6.14.1 (2017-12-13)

#### Bug Fixes

* Fix the dynamic import helper by setting __esModule flag.

### 6.14.0 (2017-12-08)

#### Potential Breaking

* Controller onInit logic is now off by default and uses flag moveControllerPropsToOnInit

#### Features

* noWrapBeforeImport functionality (using flag to opt-in)

### 6.13.0 (2017-11-24)

#### Features

* Dynamic import()

### 6.12.0 (2017-11-14)

#### Potential Breaking

* Update the no-wrap logic to just use whether there is an import or export

### 6.11.0 (2017-11-10)

#### Features

* Controller conversion enhancements to move property initialization to onInit rather than the constructor.

### 6.10.1 (2017-11-09)

#### Bug Fixes

* Fix support for assigning named exports to default export when it is a function.

### 6.10.0 (2017-11-09)

#### Features

* Support metadata and renderer static props assigned outside the class (`Class.renderer = {}`)

#### Breaking

* Removed support for defining renderer and metadata variables in JSDoc
