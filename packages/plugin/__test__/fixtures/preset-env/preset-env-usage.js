/**
 * This tests preset-env option 'useBuiltIns: "usage"', which adds core-js imports into the sap.ui.define dependencies array.
 * 
 * With the current test settings, it should import the following:
 *  - core-js/modules/es6.promise.js
 *  - core-js/modules/es6.string.includes.js
 *  - core-js/modules/es7.array.includes.js
 */
import SAPClass from "sap/SAPClass";

/**
 * @name my.MyClass
 */
export default class AClass extends SAPClass {
  delay() {
    return new Promise(resolve => {
      setTimeout(resolve);
    });
  }
  includes(str) {
    return str.includes("thing");
  }
}
