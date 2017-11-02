
# babel-plugin-transform-modules-ui5 for Babel 6

An unofficial Babel transformer plugin for SAP/Open UI5.

It allows you to develop SAP UI5 applications by using the latest [ES2015](http://babeljs.io/docs/learn-es2015/), including classes and modules, or even TypeScript.

## Other Similar Plugins

[sergiirocks babel-plugin-transform-ui5](https://github.com/sergiirocks/babel-plugin-transform-ui5) is a great choice if you use webpack. It allows you to configure which import paths to convert to sap.ui.define syntax and leaves the rest as ES2015 import statements, which allows webpack to load them in.

## Example

[MagicCube's babel-plugin-ui5-example](https://github.com/MagicCube/babel-plugin-ui5-example)

## Features

+ ES2015 Imports (default and named)
+ ES2015 Exports (default and named)
+ Class, using inheritance and `super` keyword
	+ Static methods and fields
	+ Class properties
	+ Class property arrow functions are bound correctly in the constructor.
+ Existing `sap.ui.define` calls don't get wrapped.
	+ Fixes `constructor` shorthand method, if used.
+ IIFE files that don't get wrapped
+ Various options to control the class name string used.
	+ JSDoc (name, namespace, alias)
	+ Decorators (name, namespace, alias)
	+ File path based namespace, including setting a prefix.

### Plugin Scope

This only transforms the UI5 relevant things. It does not transform everything to ES5 (for example it does not transform const/let to var). This makes it easier to use `babel-preset-env` to determine how to transform everything else.

### Import / Export Interops

The plugin does its best to make generated code work well with typical code using sap.ui.define, by taking a few extra steps and potentially adding a helper method.

#### Import Interop

In the case of imports, it uses a temporary name for the initial variable, and then extracts the properties from it as needed.

This:

```js
import Default, { Name1, Name2 } from 'app/File'
```

Becomes:

```js
sap.ui.define(['app/file'], function(__File) {
  function _interopRequireDefault(obj) {
    return obj && obj.__esModule ? obj.default : obj;
  }
  const Default = _interopRequireDefault(__File);
  const Name1 = __File.Name1;
  const Name2 = __File.Name2;
}
```

The above code will work if File is an ES Module or not. In both cases, it gets Name1 and Name2 from properties on the object or module.
For Default, it either uses the object itself if it's not an ES module, or the 'default' export from the module if it is.


#### Export Interop

Export interop is a bit trickier. Mixing default and named exports is tricky if the code importing them does not have an interop and expects a non-ES module.

If your generated code will only be imported by code having an import interop, then you don't have anything to worry about it. But if the code may by used by standard UI5 code without an interop, then there are some gotchas when mixing default and named exports.

The plugin will try to assist, but is a bit limited in what it can detect and do.

As long as the default export is an object literal, the plugin will iterate over it's properties and methods and try to add them as a named export. That way, when the module is imported by code not using an interop, the module will have the same properties as the default export.

If there is a naming conflict, the plugin tries to determine if they're referencing the same object, in which case no action is needed. But if the plugin determines they's referencing different objects (i.e. different behaviour), it will raise an error.

The plugin is also limited where it can't detect properties and methods of a variable.

**Example solvable intro issue**
```js
export function one() {
	return 1
}
function two {
	return 2
}
export default {
	one, two
}

----------Output-------
{
   __esModule: true,
   one: one,
   default: {
      one: one,
      two: two
   },
   two: two
}
```

Property `two` did not have a conflict, so it was added to the export.
Property `one` had a conflict, but it was just referencing the named function, so it was ignored.


**Example non-solvable issues**
The following are not solvable by the plugin, and result in an error.
```js
export function one() {
	return 1
}

export function two() {
	return 2
}

function one_string() {
	return "one"
}

export default {
   // The plugin can't assign these to `exports` since the definition is not just a reference to the named export.
   one: one_string,
   two: () => "two"
}

```

**Potential silent issues**

```js
export function two_plus_two() {
   return 4
}

function function five() {
   return 5
}

const Utils = {
	two_plus_two: five
}

export default Utils // The plugin currently does not attempt to assign these properties to `exports`
```



## Usage

### Install the plugin

```sh
npm install babel-plugin-transform-modules-ui5 --save-dev
```

or
```sh
yarn add babel-plugin-transform-modules-ui5 --dev
```

### Configure .babelrc

At a minimum, add `transform-modules-ui5` to the `plugins`.

```json
{
  "plugins": ["transform-modules-ui5"]
}
```

At the time of writing, the babel version is 6.26.0, which does not natively support class property syntax. To use that syntax also add the plugin `babel-plugin-syntax-class-properties`.

It is also recommended to use `babel-preset-env` to control which ES version the final code is transformed to.

#### Configuring Name or Namespace

The plugin provides a few ways to set the class name or namespace used in the `SAPClass.extend(...)` call.

##### JSDoc

The simplest way to control the names is to use JSDoc. This approach will also work well with classes output from TypeScript if you configure TypeScript to generate ES6 or higher, and don't enable removeComments.

You can set the `@name`/`@alias` directly or just the `@namespace` and have the name derived from the ES6 class name. 

`@name` and `@alias` behave the same. `@name` was used originally but the `@alias` JSDoc property is used in UI5 source code, so support for that was added.
		
```js
/**
 * @alias my.app.AController
 */
class AController extends SAPController {
	...
}

/**
 * @name my.app.AController
 */
class AController extends SAPController {
	...
}
 
/**
 * @namespace my.app
 */
class AController extends SAPController {
	...
}

Will all output:

const AController = SAPController.extend("my.app.AController", {
	...
});
```

##### Decorators

Alternatively, you can use decorators to override the namespace or name used. The same properties as JSDoc will work, but instead of a space, pass the string literal to the decorator function.

NOTE that using a variable is currently not supported, but will be.

```js
@alias('my.app.AController')
class AController extends SAPController {
	...
}

@name('my.app.AController')
class AController extends SAPController {
	...
}

@namespace('my.app')
class AController extends SAPController {
	...
}

const AController = SAPController.extend("my.app.AController", {
	...
});
```

##### File based namespace

The default behaviour if no JSDoc or Decorator overrides are given is to use the file path to determine the namespace. 

This is based on the relative path from either the babelrc `sourceRoot` property or the current working directory. 

The plugin also supports supplying a namespace prefix in this mode, in case the desired namespace root is not a directory in the filesystem.

In order to pass the namespace prefix, pass it as a plugin option, and not a top-level babel option. Passing plugin options requires the array format for the plugin itself (within the outer plugins array).

```json
{
   "sourceRoot" "src/",
	"plugins": [
		["transform-modules-ui5", {
			"namespacePrefix": "my.app"
		}],
		"other-plugins"
	]
}
```

### sap.ui.define export flag

If you need the export flag on sap.ui.define, add `@export` to the JSDoc on the export default.

```js
const X = {}

/**
 * @export
 */
export default X;
```

Outputs:

```js
sap.ui.define([], function() {
  const X = {};
  return X;
}, true);
```

### Handling metadata and renderer

Because ES6 classes are not plain objects, you can't have an object property like 'metadata'. 

This plugin allows you to configure `metadata` and `renderer` as class properties (static or not) and the plugin will convert it to object properties. 

**Aside** By default, transformed class properties get moved into the constructor (`this.prop = value;`) or outside the class in case of static props (`MyClass.prop = value;`).

This:
```js
class MyControl extends SAPClass {
  renderer = MyControlRenderer;
  metadata = {
     ...
  }
}
```
Becomes:
```js
const MyControl = SAPClass.extend('MyControl', {
  renderer: MyControlRenderer,
  metadata: {
     ...
  }
});
```

#### Special handling for Typescript classes

The typescript compiler currently moves the class properties into the constructor or outside the class, just like babel's class properties transform does. 

This plugin does not currently (but will in the future) look for metadata or renderer properties in those places. So instead you can use JsDoc `@metadata` or `@renderer` to provide the values.

```js
import MyControlRenderer from 'myapp/controls/MyControlRenderer'
const metadata = {...}

/**
 * @metadata metadata
 * @renderer MyControlRenderer
 */
class MyControl extends SAPClass {
  ...
}
```


## Build with Webpack

Please take a look at [ui5-loader](https://github.com/MagicCube/ui5-loader).

## Modulization / Preload

UI5 supports Modularization through a mechanism called `preload`, which can compile many JavaScript and xml files into just one preload file.

Some preload plugins:

+ Module/CLI: [openui5-preload](https://github.com/r-murphy/openui5-preload) (Mine)
+ Gulp: [gulp-ui5-lib](https://github.com/MagicCube/gulp-ui5-lib) (MagicCube)
+ Grunt: [grunt-openui5](https://github.com/SAP/grunt-openui5) (Official SAP)


## Examples

### ES6 Codes

``` javascript
/*---------------------------------*
 * File: src/example/obj/Animal.js *
 *---------------------------------*/

import ManagedObject from "sap/ui/base/ManagedObject";

export default class Animal extends ManagedObject {

    metadata = {
        properties: {
            type: { type: "string" },
            nickName: { type: "string" }
        }
    }

    constructor(...args) {
        super(...args);
    }

    init() {
    	super.init();
	}

    callMe() {
        alert(`I'm a ${this.getType()}.
        Call me ${this.getNickName()}.`);
    }
}


/*---------------------------------*
 * File: src/example/obj/Cat.js *
 *---------------------------------*/

import Animal from "./Animal";

/**
 * @name othernamespace.Cat
 */
export default class Cat extends Animal {

    init() {
        super.init();
        this.setType("Cat");
    }

    callMe() {
        super.callMe();
        alert("Miao~");
    }

    static createCat(nickName) {
        const cat = new example.obj.Cat({
            nickName
        });
        return cat;
    }
}

/*-----------------------------------*
 * File: src/example/util/MyError.js *
 *-----------------------------------*/

export default class MyError extends Error {
	constructor(msg) {
		super(msg);
		this.name = 'MyError'
	}
}

/*-----------------------------------*
 * File: src/example/util/Utils.js   *
 *-----------------------------------*/

export function multiply(a, b) {
  return a * b
}

function add(a, b) { // Not a named export but gets added for sap.ui.define() interop.
  return a + b
}

export default {
  multiply, add
}

```

## Compiled Codes

``` javascript
/*------------------------------------*
 * File: assets/example/obj/Animal.js *
 *------------------------------------*/
 
sap.ui.define(["sap/ui/base/ManagedObject"], function (__ManagedObject) {
    function _interopRequireDefault(obj) {
        return obj && obj.__esModule ? obj.default : obj;
    }

    const ManagedObject = _interopRequireDefault(__ManagedObject);

    const Animal = ManagedObject.extend("test.fixtures.examples.Animal", {
        metadata: {
            properties: {
                type: { type: "string" },
                nickName: { type: "string" }
            }
        },
        constructor: function (...args) {
            ManagedObject.constructor.apply(this, [...args]);
        },
        init: function () {
            ManagedObject.prototype.init.apply(this, []);
        },
        callMe: function () {
            alert(`I'm a ${this.getType()}.
        Call me ${this.getNickName()}.`);
        }
    });
    return Animal;
});


/*---------------------------------*
 * File: assets/example/obj/Cat.js *
 *---------------------------------*/

sap.ui.define(["./Animal"], function (__Animal) {
    function _interopRequireDefault(obj) {
        return obj && obj.__esModule ? obj.default : obj;
    }

    const Animal = _interopRequireDefault(__Animal);

    const Cat = Animal.extend("othernamespace.Cat", {
        init: function () {
            Animal.prototype.init.apply(this, []);
            this.setType("Cat");
        },
        callMe: function () {
            Animal.prototype.callMe.apply(this, []);
            alert("Miao~");
        }
    });

    Cat.createCat = function (nickName) {
        const cat = new example.obj.Cat({
            nickName
        });
        return cat;
    };

    return Cat;
});


/*--------------------------------------*
 * File: assets/example/util/MyError.js *
 *--------------------------------------*/

sap.ui.define([], function () {
  class MyError extends Error {
    constructor(msg) {
      super(msg);
      this.name = 'MyError';
    }
  }
  return MyError;
});

/*--------------------------------------*
 * File: assets/example/util/Utils.js   *
 *--------------------------------------*/

sap.ui.define([], function () {
  const exports = {};
  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  function multiply(a, b) {
    return a * b;
  }

  function add(a, b) {
    // Not a named export but gets added for sap.ui.define() interop.
    return a + b;
  }

  exports.multiply = multiply;
  exports.default = {
    multiply, add
  };
  exports.add = add;
  return exports;
});

```


## Credits

+ Thanks to MagicCube for the upstream initial work.

## TODO

+ libs support, like sergiirocks'
+ Configuration options
	+ Export intern control
	+ Others..
