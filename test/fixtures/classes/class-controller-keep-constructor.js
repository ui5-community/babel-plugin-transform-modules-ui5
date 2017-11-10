
import Controller from 'sap/ui/core/Controller'

export default class MyController extends Controller {
  /**
   * @keep
   */
  constructor(arg) {
    console.log("constructor")
    super(arg)
    this.x = 1
  }
  other = 1;
  get getter() {
    return 1
  }
}
