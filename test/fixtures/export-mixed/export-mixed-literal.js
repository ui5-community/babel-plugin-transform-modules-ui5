
export const a = 1;
export const b = 2;

export { a as x };
export { b as y };

export default {
  a,
  x: a,
}

export const c = 3;
