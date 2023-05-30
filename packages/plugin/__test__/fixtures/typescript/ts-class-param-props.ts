import SAPClass from "sap/Class";
import SAPBar from "sap/Bar";
import SAPFoo from "sap/Foo";

/**
 * @name MyClass
 */
export default class MyClass extends SAPClass {
  foo: SAPFoo;

  constructor(public bar: SAPBar) {
    super();
    this.foo = bar.getFoo();
  }
}
