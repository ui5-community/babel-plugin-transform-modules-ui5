
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

    metadata: {
        properties: {
            type: { type: "string" },
            nickName: { type: "string" }
        }
    }

    constructor(...args) {
        super(...args);
        // TODO: Add your own construction code here.
    }

    init() {
    	super.init();
        // TODO: Add your own initialization code here.
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

@name("othernamespace.Cat")
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

```

## Compiled Codes

``` javascript
/*------------------------------------*
 * File: assets/example/obj/Animal.js *
 *------------------------------------*/
sap.ui.define(["sap/ui/base/ManagedObject"], function (ManagedObject) {
    "use strict";

  return ManagedObject.extend("example.obj.Animal", {
    metadata: {
        properties: {
            type: { type: "string" },
            nickName: { type: "string" }
        }
    },
    constructor: function constructor() {
        for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
            args[_key] = arguments[_key];
        }

        ManagedObject.apply(this, [].concat(args));
        // TODO: Add your own construction code here.
    },
    init: function init() {
        // TODO: Add your own initialization code here.
    },
    callMe: function callMe() {
        alert("I'm a " + this.getType() + ". Call me " + this.getNickName() + ".");
    }
  });
});


/*---------------------------------*
 * File: assets/example/obj/Cat.js *
 *---------------------------------*/
sap.ui.define(["./Animal"], function (Animal) {
    const Cat = Animal.extend("othernamespace.Cat", {
        init: function init() {
            Animal.prototype.init.apply(this, []);
            this.setType("Cat");
        },
        callMe: function callMe() {
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
});


/*--------------------------------------*
 * File: assets/example/util/MyError.js *
 *--------------------------------------*/

sap.ui.define([], function () {

	class MyError extends Error {
		constructor(msg) {
			super(msg);
			this.name = 'MyError'
		}
	}

	return MyError
});

```


## Credits

+ Thanks to MagicCube for the upstream initial work.

## TODO

+ libs support, like sergiirocks'
