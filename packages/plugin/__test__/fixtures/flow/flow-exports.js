// @flow

import type FooType, { OtherType } from "types";

import SAPClass from "sap/SAPClass";

/**
 * @name Foo
 */
export default class Foo extends SAPClass {
  prop: number;
}

// let fooInstance: Foo = new Foo();
// export fooInstance;

export type MyObject = {
  /* ... */
};

export interface MyInterface {
  /* ... */
}
