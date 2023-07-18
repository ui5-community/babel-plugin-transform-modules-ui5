/*!
 * ${copyright}
 */
import SAPClass from "sap/Class";
import SAPBar from "sap/Bar";
import SAPFoo from "sap/Foo";

/**
 * @name MyClass
 */
export default class MyClass extends SAPClass {
  foo: SAPFoo;

  constructor(public bar: SAPBar, private x: string, readonly y: string) {
    super();
    this.foo = bar.getFoo();
  }
}
