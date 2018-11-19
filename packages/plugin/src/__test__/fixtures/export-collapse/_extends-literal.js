 /*
 Test the plugin"s ability to find properties of the default export:
  - from inside _extend function (used by TS and babel)
    - including properties from another variable
    - when the _extends result is exported directly
  */

import X from "x"

export const one = 1
export function two() {}
export const three = 3

const O2 = {
  three
}

export default _extends({}, X, O2, {
  one,
  two
})
