
/*
This tests an error because the definitions of fn collide.
 */

export function fn() {
  return "X"
}

export default {
  fn() {
    return "Y"
  }
}
