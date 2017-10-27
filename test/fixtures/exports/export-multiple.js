
export default function def() {
  console.log("I'm the default");
}

export { def }

const thing1 = {}
const thing2 = 2
const thingy3 = 3

export { thing1, thing2, thingy3 as thing3 }

export const c = 1
export var v = 1
export let l = 1
export function f() {}

export let laterLet;
laterLet = "now"

export var laterVar;
laterVar = "var"
