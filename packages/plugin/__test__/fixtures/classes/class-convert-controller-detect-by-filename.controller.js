// Tests that controller-specific options activate for a class whose name does
// NOT contain "Controller" and has no explicit @controller tag, when the file
// has the .controller.js suffix. Previously only className.includes("Controller")
// or @controller triggered the controller code-path.

import SAPController from "sap/ui/core/Controller";

export default class AppPage extends SAPController {
  ref = this.byId("ref");

  onInit() {}
}
