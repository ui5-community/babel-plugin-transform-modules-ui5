/*
Tests the plugin"s ability to find properties of the default export:
 - when the default export is a variable.
 - from dot-assigned properties
 - from inside _extend function (used by TS and babel)
   - including properties from another variable
 */

import X from "x";

export const one = 1;
export function two() {}
export function three() {}
export function four() {}

const O2 = {
  three,
};

let D;

D = _extends({}, X, O2, {
  one,
  two,
});

D.four = four;

export default D;
