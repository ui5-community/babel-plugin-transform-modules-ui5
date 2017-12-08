
The major version will be kept the same as babel's.

### 6.14.0 (2017-12-08

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
