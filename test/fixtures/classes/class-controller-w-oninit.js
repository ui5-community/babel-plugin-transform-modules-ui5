
import Controller from 'sap/ui/core/Controller'

export default class MyController extends Controller {
  prop = 1;
  prop2 = this.a.b;
  prop3 = X.y;
  control = this.byId("control");
  other = getThing(this.prop)
  /**
   * @keep false
   */
  constructor(arg) {
    console.log("constructor")
    super(arg)
    this.x = 1
  }
  onInit() {
    this.y = this.x + 1
  }
  prop_func = () => true;
  get getter() {
    return 1
  }
}
