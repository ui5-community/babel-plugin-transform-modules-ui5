# babel transform-ui5

A community-driven Babel transformer plugin for SAPUI5/OpenUI5.

It allows you to develop SAPUI5 applications by using the latest [ECMAScript](http://babeljs.io/docs/learn-es2015/), including classes and modules, or even TypeScript.

## Install

This repo contains both a preset and a plugin. It is recommended to use the preset since the plugin will get split into two in the future.

```sh
npm install babel-preset-transform-ui5 --save-dev
```

or

```sh
yarn add babel-preset-transform-ui5 --dev
```

## Configure

### .babelrc

At a minimum, add `transform-ui5` to the `presets`.

```js
{
    "presets": ["transform-ui5"]
}
```

Or if you want to supply plugin options, use the array syntax.

```js
{
    "presets": [
        ["transform-ui5", {
            ...pluginOpts
        }]
    ]
}
```

At the time of writing the babel version is 7.3, which does not natively support class property syntax. To use that syntax also add the plugin `@babel/plugin-syntax-class-properties`.

It is also recommended to use [@babel/preset-env](https://babeljs.io/docs/en/next/babel-preset-env.html) to control which ES version the final code is transformed to.

The order of presets is important and `@babel/preset-env` should be higher in the array than this one. Babel applies them in reverse order for legacy reasons, so this preset will be applied first.

```js
{
    "presets": [
        ["@babel/preset-env", { // applied 3rd
            ...presetEnvOpts
        }],
        ["transform-ui5", { // applied 2nd
            ...pluginOpts
        }],
        "@babel/preset-typescript", // applied 1st
    ]
}
```

## Features

There are 2 main features of the plugin, and you can use both or one without the other:

1. Converting ES modules (import/export) into sap.ui.define or sap.ui.require.
2. Converting ES classes into Control.extend(..) syntax.

**NOTE:** The class transform might be split into its own plugin in the future.

This only transforms the UI5 relevant things. It does not transform everything to ES5 (for example it does not transform const/let to var). This makes it easier to use `@babel/preset-env` to transform things correctly.

A more detailed feature list includes:

- ES2015 Imports (default, named, and dynamic)
- ES2015 Exports (default and named)
- Classes, using inheritance and `super` keyword
  - Static methods and fields
  - Class properties
  - Class property arrow functions are bound correctly in the constructor.
- Existing `sap.ui.define` calls don't get wrapped but classes within can still be converted.
  - Fixes `constructor` shorthand method, if used.
- Various options to control the class name string used.
  - JSDoc (name, namespace, alias)
  - Decorators (name, namespace, alias)
  - File path based namespace, including setting a prefix.

### Converting ES modules (import/export) into sap.ui.define or sap.ui.require

The plugin will wrap any code having import/export statements in an sap.ui.define. If there is no import/export, it won't be wrapped.

#### Static Import

The plugin supports all of the ES import statements, and will convert them into sap.ui.define arguments.

```js
import Default from "module";
import Default, { Named } from "module";
import { Named1, Named2 } from "module";
import * as Namespace from "module";
```

The plugin uses a temporary name (as needed) for the initial imported variable, and then extracts the properties from it.
This allows importing ES Modules which have a 'default' value, and also non-ES modules which do not.
The plugin also merges imports statements from the same source path into a single require and then deconstructs it accordingly.

This:

```js
import Default, { Name1, Name2 } from "app/File";
import * as File from "app/File";
```

Becomes:

```js
sap.ui.define(['app/File'], function(__File) {
  "use strict";

  function _interopRequireDefault(obj) {
      return (obj && obj.__esModule && (typeof obj.default !== "undefined")) ? obj.default : obj;
  }
  const Default = _interopRequireDefault(__File);
  const Name1 = __File["Name1"];
  const Name2 = __File["Name2"];
  const File = __File;
}
```

Also refer to the `noImportInteropPrefixes` and `neverUseStrict` option below.

#### Dynamic Import

ECMAScript allows for dynamic imports calls like `import(path)` that return a Promise which resolves with an ES Module.

This plugin will convert that to an async `sap.ui.require` wrapped in a Promise.
The resolved object will be a ES module or pseudo ES module having a 'default' property on it to reference the module by, to match the format used by `import()`.
If the module is not a real ES module and already has a default property, the promise will be rejected with an error.

For JavaScript projects, this syntax doesn't provide much advantage over a small utility function and has the downside of not working if your module has a 'default' property.
The main advantage of this syntax is with TypeScript projects, where the TypeScript compiler will know the type of the imported module, so there is no need to define a separate interface for it.

Also note that while the ES dynamic import specification requires a relative path, `sap.ui.require` works with absolute paths using a module prefix.

#### Export

The plugin also supports (most of) the ES modules export syntax.

```js
export function f() {};
export const c = 'c';
export { a, b };
export { a as b };
export default {};
export default X;
export { X as default };
export let v; v = 'v'; // NOTE that the value here is currently not a live binding (http://2ality.com/2015/07/es6-module-exports.html)
```

Export is a bit trickier if you want your exported module to be imported by code that does not include an import inter-op.
If the importing code has an inter-op logic inserted by this plugin, then you don't need to worry and can disable the export inter-op features if desired.

Imagine a file like this:

```js
export function two() {
  return 2;
}
export default {
  one() {
    return 1;
  },
};
```

Which might export a module that looks like:

```js
{
    __esModule: true,
    default: {
        one() {
            return 1;
        }
    },
    two() {
        return 2;
    }
}
```

But in order to be usable in a standard `sap.ui.require` file, what we want is actually:

```js
{
    one() {
        return 1;
    }
    two() {
        return 2;
    }
}
```

This plugin's terminology for that is 'collapsing'.

##### Export Collapsing to default export

The export inter-op features do their best to only return the default export rather than returning an ES module.
To do this, it determines if all the named exports already exist on the default export (with the same value reference), or whether they can be added to it if there is not a naming conflict.

If there is a naming conflict or other reason why the named export cannot be added to the default export, the plugin will throw an error by default.

In order to determine which properties the default export already has, the plugin checks a few locations, if applicable.

- In an object literal.

```js
export default {
  prop: val,
};
// plugin knows about 'prop'
```

- In a variable declaration literal or assigned afterwards.

```js
const Module = {
  prop1: val,
};
Module.prop2 = val2;
export default Module;
// plugin knows about 'prop1' and 'prop2'
```

- In an `Object.assign(..)` or `_extends(..)`
  - \_extends is the named used by babel and typescript when compiling object spread.
  - This includes a recursive search for any additional objects used in the assign/extend which are defined in the upper block scope.

```js
const object1 = {
  prop1: val,
};
const object2 = Object.assign({}, object1, {
  prop2: val,
});
export default object2;
// plugin knows about 'prop1' and 'prop2'
```

**CAUTION**: The plugin cannot check the properties on imported modules. So if they are used in `Object.assign()` or `_extends()`, the plugin will not be aware of its properties and may override them with a named export.

##### Example non-solvable issues

The following are not solvable by the plugin, and result in an error by default.

```js
export function one() {
  return 1;
}

export function two() {
  return 2;
}

function one_string() {
  return "one";
}

const MyUtil = {
  // The plugin can't assign 'one' or 'two' to `exports` since there is a collision with a different definition.
  one: one_string,
  two: () => "two",
};
export default MyUtil;
```

##### sap.ui.define global export flag

If you need the global export flag on sap.ui.define, add `@global` to the JSDoc on the export default statement.

```js
const X = {};

/**
 * @global
 */
export default X;
```

Outputs:

```js
sap.ui.define(
  [],
  function() {
    const X = {};
    return X;
  },
  true
);
```

Also refer to the option `exportAllGlobal` below.

#### Minimal Wrapping

By default, the plugin will wrap everything in the file into the `sap.ui.define` factory function, if there is an import or an export.

However sometimes you may want to have some code run prior to the generated `sap.ui.define` call. In that case, set the property `noWrapBeforeImport` to true and the plugin will not wrap anything before the first `import`. If there are no imports, everything will still be wrapped.

There may be a future property to minimize wrapping in the case that there are no imports (i.e. only wrap the export).

Example:

```js
const X = 1;
import A from "./a";
export default {
  A,
  X,
};
```

Outputs:

```js
"use strict";

const X = 1;
sap.ui.define(["./a"], A => {
  return {
    A,
    X,
  };
});
```

Also refer to the `neverUseStrict` option below.

### Converting ES classes into Control.extend(..) syntax

By default, the plugin converts ES classes to `Control.extend(..)` syntax if the class extends from a class which has been imported.
So a class without a parent will not be converted to .extend() syntax.

There are a few options or some metadata you can use to control this.

#### Configuring Name or Namespace

The plugin provides a few ways to set the class name or namespace used in the `SAPClass.extend(...)` call.

##### File based namespace (default)

The default behaviour if no JSDoc or Decorator overrides are given is to use the file path to determine the namespace to prefix the class name with.

This is based on the relative path from either the babelrc `sourceRoot` property or the current working directory.

The plugin also supports supplying a namespace prefix in this mode, in case the desired namespace root is not a directory in the filesystem.

In order to pass the namespace prefix, pass it as a plugin option, and not a top-level babel option. Passing plugin options requires the array format for the plugin itself (within the outer plugins array).

```js
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

If the default file-based namespace does not work for you (perhaps the app name is not in the file hierarchy), there are a few way to override.

##### JSDoc

The simplest way to override the names is to use JSDoc. This approach will also work well with classes output from TypeScript if you configure TypeScript to generate ES6 or higher, and don't enable `removeComments``.

You can set the `@name`/`@alias` directly or just the `@namespace` and have the name derived from the ES class name.

`@name` and `@alias` behave the same; `@name` was used originally but the `@alias` JSDoc property is used in UI5 source code, so support for that was added.

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

NOTE that using a variable is currently not supported.

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

### Don't convert class

If you have a class which extends from an import that you don't want to convert to .extend(..) syntax, you can add the `@nonui5` (case insensitive) jsdoc or decorator to it. Also see Options below for overriding the default behaviour.

### Class Properties

The plugin supports converting class properties, and there are a few scenarios.

- [proposal-class-public-fields](https://github.com/tc39/proposal-class-public-fields)
- [proposal-class-fields](https://github.com/tc39/proposal-class-fields)

#### Static Class Props

Static class props are always added to the extend object. It's recommended to always use static if you want the property as part of the extend object. Some examples of this are `metadata`, `renderer` and any formatters or factories you need in views.

```js
class MyControl extends SAPControl {
  static metadata = {...};
  static renderer = {...};
}

class Controller extends SAPController {
  static ThingFactory = ThingFactory;
  static ThingFormatter = ThingFormatter;
}
```

#### Instance Class Props

Instance props either get added to the constructor or to the `onInit` function (for controllers).

Before version 7.x, they could also get added directly to the `SomeClass.extend(..)` config object, but not anymore now. So if you still want a prop in the extend object, it's best to use a static prop. However, there are some exception where it is known that UI5 expects certain properties in the extend object, like `renderer`, `metadata` and `overrides`<!-- and some configurable cases related to controller extensions (see below)-->.

Refer to the next section to see the logic for determining if `constructor` or `onInit` is used as the init function for class properties.

The logic for determining if the prop going into the controller/onInit or the extend object is whether it uses 'this' or needs 'this' context (i.e. arrow function).

In the bind method (either constructor or onInit), the properties get added after the `super` call (if applicable) and before any other statements, so that it's safe to use those properties.

```js
class Controller extends SAPController {
  A = 1; // added to constructor or onInit (to extend object in v6 and lower)
  B = Imported.B; // added to constructor or onInit (to extend object in v6 and lower)
  C = () => true; // added to constructor or onInit
  D = this.B.C; // added to constructor or onInit
  E = func(this); // added to constructor or onInit
  F = func(this.A); // added to constructor or onInit

  onInit() {
    super.onInit();
    // --- Props get added here ---
    doThing(this.A, this.D);
  }
}
```

```js
const Controller = SAPController.extend("...", {
  A: 1,
  B: Imported.B,
  onInit: function onInit() {
    if (typeof SAPController.prototype.onInit === "function") {
      SAPController.prototype.onInit.apply(this);
    }
    this.C = () => true;
    this.D = this.B.C;
    this.E = func(this);
    this.F = func(this.A);
    doThing(this.A, this.D);
  },
});
```

#### Special Class Property Handling for Controllers

The default class property behaviour of babel is to move the property into the constructor. This plugin has a `moveControllerPropsToOnInit` option that moves them to the `onInit` function rather than the `constructor`. This is useful since the `onInit` method is called after the view's controls have been created (but not yet rendered).

When that property is enabled, any class with 'Controller' in the name or namespace, or having the JSDoc `@controller` will be treated as a controller.

This is mostly beneficial for TypeScript projects that want easy access to controls without always casting them. In typescript, the `byId(..)` method of a controller returns a `Control` instance. Rather than continually casting that to the controller type such as `sap.m.Input`, it can be useful to use a class property.

```ts
/**
 * @name app.MyController
 * @controller
 */
class MyController extends Controller {
  input: SAPInput = this.byId("input") as SAPInput;

  constructor() {
    super();
  }

  onInit(evt: sap.ui.base.Event) {}
}
```

Results in:

```ts
const MyController = Controller.extend("app.MyController", {
  onInit(evt) {
    this.input = this.byId("input");
  },
});
```

Of course, the alternative would be to define and instantiate the property separately. Or to cast the control whenever it's used.

```ts
/**
 * @name app.MyController
 * @controller
 */
class MyController extends Controller {
  input: SAPInput;

  onInit(evt: sap.ui.base.Event) {
    this.input = this.byId("input") as SAPInput;
  }
}
```

#### Handling metadata and renderer

Because ES classes are not plain objects, you can't have an object property like 'metadata'.

This plugin allows you to configure `metadata` and `renderer` as class properties (static or not) and the plugin will convert it to object properties for the extend call.

```js
class MyControl extends SAPClass {
    static renderer = MyControlRenderer;
    static metadata = {
        ...
    }
}
```

is converted to

```js
const MyControl = SAPClass.extend('MyControl', {
    renderer: MyControlRenderer,
    metadata: {
        ...
    }
});
```

#### Properties related to Controller Extensions

The new (as of UI5 1.112) `overrides` class property required for implementing a `ControllerExtension` will also be added to the extend object.
(For backward compatibility with older UI5 runtimes, you can use `overridesToOverride: true`.)

```js
class MyExtension extends ControllerExtension {

  static overrides = {
    onPageReady: function () { }
  }
}
```

is converted to

```js
const MyExtension = ControllerExtension.extend("MyExtension", {
  overrides: {
    onPageReady: function () {}
  }
});
return MyExtension;
```
<!--
When a controller implemented by you *uses* pre-defined controller extensions, in JavaScript the respective extension *class* needs to be assigned to the extend object; the UI5 runtime will instatiate the extension and this *instance* will then be available as `this.extensionName`.

To support the same in TypeScript, while in the JavaScript code a controller *class* must be assigned in the extend object, the TypeScript compiler needs to see that the class property contains an extension *instance*. To support this, the plugin applies special logic which transforms the code accordingly. This logic is triggered with any comment containing the string `@transformControllerExtension` or the `@transformControllerExtension` decorator directly preceding the class property. And the class property must only be typed, but not assigned an instance. (The instance is created by the UI5 framework.)

Example:
```js
class MyController extends Controller {

  // @transformControllerExtension
  routing: Routing; // use the "Routing" extension provided by "sap/fe/core/controllerextensions/Routing"

  someMethod() {
    this.routing.doSomething();
  }
}
```

is converted to

```js
const MyController = Controller.extend("MyController", {
  routing: Routing, // note that this is now the Routing CLASS being assigned as value within the extend object, while above it was the Routing TYPE defining the type of the member property
  
  someMethod: function() {
    this.routing.doSomething();
  }
});
return MyController;
```
-->
#### Static Properties

Since class properties are an early ES proposal, TypeScript's compiler (like babel's class properties transform) moves static properties outside the class definition, and moves instance properties inside the constructor (even if TypeScript is configured to output ESNext).

To support this, the plugin will also search for static properties outside the class definition. It does not currently search in the constructor (but will in the future) so be sure to define renderer and metadata as static props if Typescript is used.

```ts
/** Typescript **/
class MyControl extends SAPClass {
    static renderer: any = MyControlRenderer;
    static metadata: any = {
        ...
    };
}

/** Typescript Output **/
class MyControl extends SAPClass {}
MyControl.renderer = MyControlRenderer;
MyControl.metadata = {
    ...
};

/** Final Output **/
const MyControl = SAPClass.extend('MyControl', {
    renderer: MyControlRenderer,
    metadata: {
        ...
    }
});
```

**CAUTION** The plugin does not currently search for 'metadata' or 'renderer' properties inside the constructor. So don't apply Babel's class property transform plugin before this one if you have metadata/renderer as instance properties (static properties are safe).

### Comments

In case of defining a *copyright* comment in your source code (detected by a leading `!`) at the first place, the plugin ensures to include it also as leading comment in the generated file at the first place, e.g.:

```ts
/*!
 * ${copyright}
 */
import Control from "sap/ui/core/Control";
```

will be converted to:

```js
/*!
 * ${copyright}
 */
sap.ui.define(["sap/ui/core/Control"], function(Control) { /* ... */ });
```

In general, comments are preserved, but for each class property/method whose position is changed, only the leading comment(s) are actively moved along with the member. Others may disappear.

## Options

### Imports

- `noImportInteropPrefixes` (Default `['sap/']`) A list of import path prefixes which never need an import inter-opt.
- `modulesMap` (Default {}) Mapping for an import's path. Accepts object or function.

### Exports

- `allowUnsafeMixedExports` (Default: false) No errors for unsafe mixed exports (mix of named and default export where named cannot be collapsed\*)
- `noExportCollapse` (Default: false) Skip collapsing\* named exports to the default export.
- `noExportExtend` (Default: false) Skips assigning named exports to the default export.
- `exportAllGlobal` (Default: false) Adds the export flag to all sap.ui.define files.

### Wrapping

- `noWrapBeforeImport` (Default: false) Does not wrap code before the first import (if there are imports).

### Class Conversion

- `namespacePrefix` (Default: '') Prefix to apply to namespace derived from directory.
- `autoConvertAllExtendClasses` (Default false). Converts all classes by default, provided they extend from an imported class. Version 6 default behaviour.
- `autoConvertControllerClass` (Default true). Converts the classes in a `.controller.js` file by default, if it extends from an imported class. Use `@nonui5` if there are multiple classes in a controller file which extend from an import.
- `neverConvertClass` (Default: false) Never convert classes to SAPClass.extend() syntax.
- `moveControllerPropsToOnInit` (Default: false) Moves class props in a controller to the onInit method instead of constructor.
- `moveControllerConstructorToOnInit` (Default: false) Moves existing constructor code in a controller to the onInit method. Enabling will auto-enable `moveControllerPropsToOnInit`.
- `addControllerStaticPropsToExtend` (Default: false) Moves static props of a controller to the extends call. Useful for formatters.
- `onlyMoveClassPropsUsingThis` (Default: false) Set to use old behavior where only instance class props referencing `this` would be moved to the constructor or onInit. New default is to always move instance props.
- `overridesToOverride` (Default: false) Changes the name of the static overrides to override when being added to ControllerExtension.extend() allowing to use the new overrides keyword with older UI5 versions
- `neverUseStrict` (Default: false) Disables the addition of the `"use strict";` directive to the program or `sap.ui.define` callback function.

\* 'collapsing' named exports is a combination of simply ignoring them if their definition is the same as a property on the default export, and also assigning them to the default export.

\*\* This plugin also makes use of babel's standard `sourceRoot` option.

TODO: more options and better description.

## Other Similar Plugins

[sergiirocks babel-plugin-transform-ui5](https://github.com/sergiirocks/babel-plugin-transform-ui5) is a great choice if you use webpack. It allows you to configure which import paths to convert to sap.ui.define syntax and leaves the rest as ES2015 import statements, which allows webpack to load them in. This plugin will have that functionality soon. Otherwise this plugin handles more edge cases with named exports, class conversion, and typescript output support.

## Example

[openui5-master-detail-app-ts](https://github.com/r-murphy/openui5-masterdetail-app-ts), which is a fork of SAP's openui5-master-detail-app converted to TypeScript.

## Building with Webpack

Take a look at [ui5-loader](https://github.com/MagicCube/ui5-loader) (we have not tried this).

## Modularization / Preload

UI5 supports Modularization through a mechanism called `preload`, which can compile many JavaScript and xml files into just one preload file.

Some preload plugins:

- Module/CLI: [openui5-preload](https://github.com/r-murphy/openui5-preload) (also created by Ryan Murphy)
- Gulp: [gulp-ui5-lib](https://github.com/MagicCube/gulp-ui5-lib) (MagicCube)
- Grunt: [grunt-openui5](https://github.com/SAP/grunt-openui5) (Official SAP)

## Credits

- Thanks to MagicCube for the upstream initial work.

## TODO

- libs support, like sergiirocks'
- See if we can export a live binding (getter?)
- Configuration options
  - Export interop control
  - Others..

## Contribute

Please do! Open an issue, or file a PR.
Issues also welcome for feature requests.

## License

MIT © 2019 Ryan Murphy and contributors
