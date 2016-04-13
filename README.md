# babel-plugin-ui5 for Babel 6
An UNOFFICIAL experimental Babel transformer plugin for SAP UI5.
It allows you to develop SAP UI5 applications by using the latest [ES6](http://babeljs.io/docs/learn-es2015/), including new syntax and objective oriented programming technology.

## Features
+ Imports
+ Class, inheritance and `super` keyword
+ UI5's `metadata` field
+ Static methods and fields
+ Most of ES6 features supported by Babel, like arrow functions, spreading, default value of parameters, etc.
+ Packed up in a preset named `babel-preset-ui5` or `ui5` for short.

## Babel version
Currently this version only supports `Babel 6`.

If you still want to use Babel 5 in your project, please try my previous project [babel-ui5-plugin](https://github.com/MagicCube/babel-ui5-plugin).

## Usage
### 1. Install the preset
```
$ npm install --save-dev babel-preset-ui5
```
> `babel-plugin-ui5` require a bunch of plugins including `babel-preset-es2015` and `babel-plugin-syntax-class-properties`.

> Although you can install `babel-plugin-ui5` and its dependencies directly,
we strongly recommend to install via `babel-preset-ui5`.

### 2. Configure .babelrc
Add `ui5` to the `presets`.
```json
{
  "presets": ["ui5"]
}
```

## Usage with Gulp *(strongly recommended)*

Suppose that in your project, all the source codes are stored in `src` folder, and all the compiled codes will later be put in `assets` folder.

```
<your-ui5-project>
    ├── <assets>
    ├── <src>
    │   └── <your_module>
    │       └── <sub_folder>
    │           ├── ClassA.js
    │           └── ClassB.js
    ├── .babelrc
    ├── gulpfile.js
    └── package.json
```

### 1. Configure packages.json
Make sure the `babel-preset-ui5` is in your own `package.json`.
```js
{
    ...
    "devDependencies": {
        "babel-cli": "^6.7.5",
        "babel-preset-ui5": "^6",
        "del": "^2.2.0",
        "gulp": "^3.9.1",
        "gulp-babel": "^6.1.2",
        "gulp-concat": "^2.6.0",
        "gulp-rename": "^1.2.2",
        "gulp-uglify": "^1.5.3",
        "run-sequence": "^1.1.5"
    }
    ...
}
```
If you don't, please execute the following commands.
```
$ npm install --save-dev babel-cli
$ npm install --save-dev del gulp gulp-babel gulp-concat gulp-rename gulp-uglify run-sequence
$ npm install --save-dev babel-preset-ui5
```

### 2. Configure .babelrc
Add a `.babelrc` in your project root folder.
```js
{
    sourceRoot: "./src",
    presets: [
        "ui5"
    ]
}
```
> The `sourceRoot` property can helps the plugin to output the right namespace.

### 3. Configure gulpfile.js
Add a `gulpfile.js` in your project root folder.
```js
const babel = require("gulp-babel");
const concat = require("gulp-concat");
const del = require("del");
const gulp = require("gulp");
const rename = require("gulp-rename");
const runSequence = require("run-sequence");
const uglify = require("gulp-uglify");

const SRC_ROOT = "./src";
const ASSETS_ROOT = "./assets";

gulp.task("default", [ "build" ]);

gulp.task("clean", cb => {
    del(`${ASSETS_ROOT}`).then(() => {
        cb()
    }, reason => {
        cb(reason);
    });
});

gulp.task("build", [ "clean" ], cb => {
    runSequence(
        "build-js",
        "concat-js",
        "uglify-js"
        cb
    );
});

gulp.task("build-js", () => {
    return gulp.src(`${SRC_ROOT}/**/*.js`)
        .pipe(babel())
        .pipe(gulp.dest(`${ASSETS_ROOT}`));
});

gulp.task("concat-js", () => {
    return gulp.src(`${ASSETS_ROOT}/**/*.js`)
        .pipe(concat("all-dbg.js"))
        .pipe(gulp.dest(`${ASSETS_ROOT}`));
});

gulp.task("uglify-js", () => {
    return gulp.src(`${ASSETS_ROOT}/all-dbg.js`)
        .pipe(uglify())
        .pipe(rename(path => {
            path.basename = "all";
        }))
        .pipe(gulp.dest(`${ASSETS_ROOT}`));
});
```

### 4. Build with Gulp
Execute `gulp` command in your project root folder.
Now your project will look like this
```
<your-ui5-project>
    ├── <assets>
    │   └── <your_module>
    │       ├── <sub_folder>
    │       │   ├── ClassA.js
    │       │   └── ClassB.js
    │       ├── all-dbg.js
    │       └── all.js
    ├── <src>
    │   └── <your_module>
    │       └── <sub_folder>
    │           ├── ClassA.js
    │           └── ClassB.js
    ├── .babelrc
    ├── gulpfile.js
    └── package.json
```
+ `all-dbg.js` contains all the JavaScript in the `src` folder.
+ `all.js` is the uglified version of `all-dbg.js`. Please only include this in
  production mode.
+ Other `*.js` files are for debug purpose.
+ If you're familiar with `gulp-watch` and `gulp-connect`, just use your own
  imaginations, you can use them in development mode.




## Modulization
SAP UI5 supports Modulization through a mechanism called `library`. With my another
Gulp plugin [gulp-ui5-lib](https://github.com/MagicCube/gulp-ui5-lib), you're
now able to compile hundreds of JavaScript files into just one library preload
JSON file.

Please also take a look at [babel-plugin-ui5-example](https://github.com/MagicCube/babel-plugin-ui5-example),
you'll find the answer.


## Example
To get the full project example, please visit [babel-plugin-ui5-example](https://github.com/MagicCube/babel-plugin-ui5-example).

### ES6 Codes
``` javascript
/*---------------------------------*
 * File: src/example/obj/Animal.js *
 *---------------------------------*/

import ManagedObject from "sap/ui/base/ManagedObject";

export default class Animal extends ManagedObject
{
    metadata: {
        properties: {
            type: { type: "string" },
            nickName: { type: "string" }
        }
    }

    constructor(...args)
    {
        super(...args);
        // TODO: Add your own construction code here.
    }

    init()
    {
        // TODO: Add your own initialization code here.
	}

    callMe()
    {
        alert(`I'm a ${this.getType()}.
        Call me ${this.getNickName()}.`);
    }
}



/*---------------------------------*
 * File: src/example/obj/Cat.js *
 *---------------------------------*/
import Animal from "./Animal";

export default class Cat extends Animal
{
    init()
    {
        super.init();
        this.setType("Cat");
    }

    callMe()
    {
        super.callMe();
        alert("Miao~");
    }

    static createCat(nickName)
    {
        const cat = new example.obj.Cat({
            nickName
        });
        return cat;
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
    "use strict";

    return Animal.extend("example.obj.Cat", {
        init: function init() {
            Animal.prototype.init.apply(this, []);
            this.setType("Cat");
        },
        callMe: function callMe() {
            Animal.prototype.callMe.apply(this, []);
            alert("Miao~");
        }
    });
});

example.obj.Cat.createCat = function (nickName) {
    "use strict";

    var cat = new example.obj.Cat({
        nickName: nickName
    });
    return cat;
};

```

### Full example
To get the full project example, please visit [babel-plugin-ui5-example](https://github.com/MagicCube/babel-plugin-ui5-example).
