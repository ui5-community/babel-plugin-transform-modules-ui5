/*
This tests an error because the definitions of fn collide.
 */

export function a() {
  return "X";
}

export default {
  a() {
    // conflicting definition from the named export a
    return "Y";
  },
};
