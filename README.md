# babel-plugin-ui5
An UNOFFICIAL experimental Babel transformer plugin for SAP UI5.
It allows you to develop SAP UI5 applications by using the latest [ES6](http://babeljs.io/docs/learn-es2015/), including new syntax and objective oriented programming technology.
This plugin can automatically transform your ES6 codes to SAP UI5 based ES5 codes with [ESLINT](http://eslint.org/) proved.

# Features
+ Imports
+ Class, inheritance and 'super' keyword.
+ Meta properties
+ Static members
+ Most of ES6 features supported by Babel, like arrow functions, spreading, default value of parameters, etc.

# Babel 5 support
Currently this version only support Babel 6.
If you still want to use Babel 5 in your project, please visit my previous project [babel-ui5-plugin](https://github.com/MagicCube/babel-ui5-plugin).

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
