import X from "x";

export const one = 1;
export function two() {}
export const three = 3;
export function five() {}
export function six() {}

export const anotherConst = 9;
export function otherFN() {}

const O2 = {
  six,
};

const Utils = Object.assign(
  {},
  X,
  {
    one,
    two,
  },
  {
    five,
  },
  O2 // recursion test
);

Utils.three = 3;

export default Utils;
