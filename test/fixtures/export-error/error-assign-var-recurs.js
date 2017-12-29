

export function foo() {} // conflicts with O2 foo

const O2 = {
  foo: 1
}

const Exported = Object.assign({},
  O2 // recursion test
)

export default Exported
