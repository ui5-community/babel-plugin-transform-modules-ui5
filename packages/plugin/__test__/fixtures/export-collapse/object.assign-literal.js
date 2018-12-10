import X from "x";

export const one = 1;
export const two = "2";
export function foo() {}

export const anotherN = 0;
export const anotherS = "s";

export default Object.assign({}, X, {
  one: 1,
  two: "2",
  foo,
});
