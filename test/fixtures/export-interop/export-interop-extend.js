
/**
 * Named export 'one' can be ignored since it's on X and as the same literal.
 * Named export 'two' gets assigned to 'X'
 */

export function one() {}
export function two() {}

const X = {
  one
}

export default X
