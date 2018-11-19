
export default class MyError extends Error {
  constructor (m) {
    super(m)
    console.log("constructor")
    this.name = "MyError"
  }
}
