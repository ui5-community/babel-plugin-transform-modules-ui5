// Imports the default export of BaseController (which uses `export class Base` + `export default Base`).
// After the named-export unwrap fix, the "\0default" sentinel is correctly recorded for
// BaseController.js and MyController is converted.
import Base from "./BaseController";

export default class MyController extends Base {}
