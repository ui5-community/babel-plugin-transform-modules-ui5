
export default class MyError extends Error {
  constructor(msg) {
    super(msg);
    this.name = "MyError"
  }
}
