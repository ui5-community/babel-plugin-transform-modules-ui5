import SAPClass from "sap/SAPClass";

const Formatter = Formatter;
const mdata = {};

/**
 * @name test.fixtures.classes.MyClass
 */
export default class MyClass extends SAPClass {
  // some comment
  myNumber = 1;

  /**
   * block comment
   */
  static myOtherNumber = 42;

  // this is MY method
  myMethod() { }

  /**
   * this is also my method
   */
  myOtherMethod() { }

  // this property is not moved into the constructor
  overrides = {}
}
