function hello() {
  return "hey";
}

export default class Thing {
  constructor() {
    console.log("constructor");
  }
}

Thing.foo = hello;
