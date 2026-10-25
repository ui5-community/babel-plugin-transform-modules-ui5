import Controller from "sap/ui/core/Controller";

/**
 * @name test.fixtures.classes.MyController
 */
export default class MyController extends Controller {
  /** Normal prop — should move to onInit */
  prop = 1;

  /**
   * @movePropsToConstructor
   */
  formatter = { formatValue: (v) => v };

  /** Arrow fn — should move to onInit */
  handler = () => true;

  onInit() {
    this.title = "hello";
  }
}
