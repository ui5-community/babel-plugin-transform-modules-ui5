
let one = 1

export default function add() {
  return one + two + this.x
}

add.x = 3

let two = 2
