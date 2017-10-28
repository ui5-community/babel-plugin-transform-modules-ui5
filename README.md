
# babel-plugin-transform-modules-ui5 for Babel 6

An unofficial experimental Babel transformer plugin for SAP UI5.

It allows you to develop SAP UI5 applications by using the latest [ES2015](http://babeljs.io/docs/learn-es2015/), including classes and modules.

## Other Similar Plugins

[sergiirocks babel-plugin-transform-ui5](https://github.com/sergiirocks/babel-plugin-transform-ui5) is a great choice if you use webpack. It allows you to configure which import paths to convert to sap.ui.define syntax and leaves the rest as ES2015 import statements, which allows webpack to load them in.

## Example

[MagicCube's babel-plugin-ui5-example](https://github.com/MagicCube/babel-plugin-ui5-example)

## Features

+ ES2015 Imports (default and named)
+ ES2015 Exports (default and named)
+ Uses an interop to import either a module or a non-module
+ Class, inheritance and `super` keyword
+ UI5's `metadata` field
+ Static methods and fields
+ Fixes `constructor` shorthand method
+ Allows for existing sap.ui.define calls
	+ They don't get wrapped, but the `constructor` shorthand will still get fixed
+ Allows for IIFE files that don't get wrapped
+ Decorator support to set extend name

## Limitations / Not Supported

+ The `import * as X from 'X'` handling is not per spec. It just assigns the required object directly, but it should actually clone it and remove the default export.
That will be fixed shortly.


### Plugin Scope

This only transforms the UI5 relevant things. It does not transform everything to ES5 (for example it does not transform const/let to var). This makes it easier to use `babel-preset-env` to determine how to transform everything else.

### Comparison to upstream (MagicCube) plugin

+ Does not wrap files that already have sap.ui.define or use an IIFE as the first function call.
+ Defers the `return` statement to the end of the sap.ui.define block.
	+ Allows code after the `export default` statement.
	+ Attaches static methods within the sap.ui.define rather than after.
+ Supports declaring the class and exporting the class on different lines.
+ Supports multiple classes in a file.
+ Supports non-UI5 classes (see `MyError.js` example).
	+ The current logic is that if the class extends from one of the imports, it is assumed to be a UI5 class. Otherwise it is left as-is.
+ Supports overriding the name or namespace used when calling `extend(...)` (See `Cat.js` example)
+ Supports named exports.

## TODO

+ Add the sourceRoot logic back and make name/namespace decorator optional
+ Use correct logic for `import * as`
+ Convert the super calls within convertClassToUI5Extend for better performance.
+ Configuration options

## Usage

### Install the plugin

```sh
npm install --save-dev babel-plugin-transform-modules-ui5
```

or
```sh
yarn add --dev babel-plugin-transform-modules-ui5
```

### Configure .babelrc

At a minimum, add `transform-modules-ui5` to the `plugins`.

```json
{
  "plugins": ["transform-modules-ui5"]
}
```

Optionally, you can use decorators to override the namespace or name used when calling `.extend(name, {...})`. To do so, you will also need the plugin `babel-plugin-syntax-decorators`.

At the time of writing, the babel version is 6.26.0, which does not natively support class property syntax. To use that syntax also add the plugin `babel-plugin-syntax-class-properties`.

It is also recommended to use `babel-preset-env` to control which ES version the the final code is transformed to.

### 3. Build with Webpack

Please take a look at [ui5-loader](https://github.com/MagicCube/ui5-loader).

## Modulization

UI5 supports Modularization through a mechanism called `preload`, which can compile many JavaScript and xml files into just one preload file.

Some preload plugins:

+ Module/CLI: [openui5-preload](https://github.com/r-murphy/openui5-preload) (Mine)
+ Gulp: [gulp-ui5-lib](https://github.com/MagicCube/gulp-ui5-lib) (MagicCube)
+ Grunt: [grunt-openui5](https://github.com/SAP/grunt-openui5) (Official SAP)


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
