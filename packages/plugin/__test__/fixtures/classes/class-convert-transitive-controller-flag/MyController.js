// Extends a local AppBase that itself extends sap/ui/core/mvc/Controller.
// Neither the class name nor the superclass name contains "Controller", so the controller
// flag must be auto-set via transitive detection — not by the name-contains check.
// With moveControllerPropsToOnInit the constructor body should move to onInit.
import AppBase from "./BaseController";

class MyView extends AppBase {
  constructor() {
    super();
    this.value = 42;
  }
}
