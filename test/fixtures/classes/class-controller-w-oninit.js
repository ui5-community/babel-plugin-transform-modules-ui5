
import Controller from 'sap/ui/core/Controller'

export default class MyController extends Controller {
  /**
   * @keep false
   */
  constructor(arg) {
    console.log("constructor")
    super(arg)
    this.x = 1
  }
  onInit() {
    this.y = 2
  }
  prop = 1;
  prop_func = () => true;
  get getter() {
    return 1
  }
}
