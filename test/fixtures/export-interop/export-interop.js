
// This tests the scenario when there is a mix of named and default exports.
// If the importing module has an interop, there's no issue with that.
// But if not, the importing module will get the 'exports' object and not the 'default' object.
// If the 'exports' doesn't have all the properties that 'default' has, the importing module will get an unexpected undefined.


function notExported() {}

export function exported() {}

export function bar() {}

export function foo() {}

const DEF = {
  notExported,
  exported,
  foz: foo,
  baz: bar,
  one: 1,
}

export default DEF

export {
  bar as baz
}
