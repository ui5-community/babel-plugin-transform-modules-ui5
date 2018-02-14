
// This conversion will be run with preset env set to ie >= 11.
// In general, we want to ensure that the class transform does not get applied before out own.

import SAPClass from "sap/class";

/**
 * @name my.MyClass
 */
export default class MyClass extends SAPClass {

  x = 1;

  static X = 1;
  
  fn() {
    // The purpose of the setTimeout is to ensure that "this" is correct for the super call
    // when the arrow function transform is applied (i.e. our super transform must run first)
    setTimeout(() => {
      super.fn();
    });
  }

}
