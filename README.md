# babel-plugin-ui5 for Babel 6
An UNOFFICIAL experimental Babel transformer plugin for SAP UI5.
It allows you to develop SAP UI5 applications by using the latest [ES6](http://babeljs.io/docs/learn-es2015/), including new syntax and objective oriented programming technology.
This plugin can automatically transform your ES6 codes to SAP UI5 based ES5 codes with [ESLINT](http://eslint.org/) proved.

# Features
+ Imports
+ Class, inheritance and `super` keyword.
+ UI5's `metadata` field
+ Static methods and fields
+ Most of ES6 features supported by Babel, like arrow functions, spreading, default value of parameters, etc.

# Babel 6 support
Currently this version only support `Babel 6`.

# Babel 5 support
If you still want to use Babel 5 in your project, please visit my previous project [babel-ui5-plugin](https://github.com/MagicCube/babel-ui5-plugin).

# Building environment with Gulp (RECOMMENDED)

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

## 1. Configure packages.json
Make sure the following packages are in your own `package.json`.
```js
{
    ...
    "devDependencies": {
        "babel-cli": "^6.7.5",
        "babel-plugin-syntax-class-properties": "^6.5.0",
        "babel-plugin-ui5": "^6",
        "babel-preset-es2015": "^6.6.0",
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
$ npm install --save-dev babel-cli babel-plugin-syntax-class-properties babel-plugin-ui5 babel-preset-es2015
$ npm install --save-dev del gulp gulp-babel gulp-concat gulp-rename gulp-uglify run-sequence
```

## 2. Configure .babelrc
Add a `.babelrc` in your project root folder.
```js
{
    sourceRoot: "./src",
    plugins: [
        "babel-plugin-transform-es2015-template-literals",
        "babel-plugin-transform-es2015-literals",
        "babel-plugin-transform-es2015-function-name",
        "babel-plugin-transform-es2015-arrow-functions",
        "babel-plugin-transform-es2015-block-scoped-functions",
        "babel-plugin-transform-es2015-shorthand-properties",
        "babel-plugin-transform-es2015-computed-properties",
        "babel-plugin-transform-es2015-duplicate-keys",
        "babel-plugin-transform-es2015-for-of",
        "babel-plugin-transform-es2015-sticky-regex",
        "babel-plugin-transform-es2015-unicode-regex",
        "babel-plugin-check-es2015-constants",
        "babel-plugin-transform-es2015-spread",
        "babel-plugin-transform-es2015-parameters",
        "babel-plugin-transform-es2015-destructuring",
        "babel-plugin-transform-es2015-block-scoping",
        "babel-plugin-transform-es2015-typeof-symbol",
        "babel-plugin-transform-regenerator",

        "syntax-class-properties",
        "babel-plugin-ui5"
    ]
}
```

## 3. Configure gulpfile.js
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

## 4. Build with Gulp
Execute `gulp` command in your project root folder.
Now your project will look like this
```
<your-ui5-project>
    ├── <assets>
    │   ├── all-dbg.js
    │   ├── all.js
    │   └── <your_module>
    │       └── <sub_folder>
    │           ├── ClassA.js
    │           └── ClassB.js
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
+ `all.js` is the uglified version of `all-dbg.js`. Please only include this in production mode.
+ Other `*.js` files are for debug purpose.
+ If you're familiar with `gulp-watch` and `gulp-connect`, just use your own imaginations, you can use them in development mode.






# Example
Please see [babel-plugin-ui5-example](https://github.com/MagicCube/babel-plugin-ui5-example)

## ES6 Codes
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

> To get the full project example, please visit [babel-plugin-ui5-example](https://github.com/MagicCube/babel-plugin-ui5-example).
