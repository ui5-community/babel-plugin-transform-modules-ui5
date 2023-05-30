// This conversion will be run with preset env set to ie >= 11.
// In general, we want to ensure that the class transform does not get applied before out own.

import SAPClass from "sap/class";

/**
 * @name my.MyClass
 */
export default class MyClass extends SAPClass {
  get thing() {
    return this._thing;
  }
  set thing(value) {
    this._thing = value;
  }
}
