import X from "x";

export function foo() {} // conflicts with Exported.foo

const O2 = {
  six,
};

const Exported = Object.assign({}, X);

Exported.foo = 1;

export default Exported;
