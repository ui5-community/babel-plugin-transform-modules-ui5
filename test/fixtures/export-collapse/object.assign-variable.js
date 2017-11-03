
import X from 'x'

export const one = 1
export function two() {}
export const three = 3
export function four() {}
export function five() {}
export function six() {}

const O2 = {
  six
}

const Utils = Object.assign({},
  X,
  {
    one,
    two
  }, {
    five
  },
  O2 // recursion test
)

Utils.three = 3
Utils.four = 4

export default Utils
