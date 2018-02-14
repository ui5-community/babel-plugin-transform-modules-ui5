
/**
Tests that exports can be collapsed onto to an object using a variable.
  - Named export "one" can be ignored since it"s on X and as the same literal.
  - Named export "foo" can be ignored since it"s on X and as the same literal.
  - Named export "two" gets assigned to "X"
  - Named export "bar" gets assigned to "X"
*/

export function one() {}
export function two() {}

export { one as foo, two as bar }

const X = {
  one,
  foo: one,
}

export default X
