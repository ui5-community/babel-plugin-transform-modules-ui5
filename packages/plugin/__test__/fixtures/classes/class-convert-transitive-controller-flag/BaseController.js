import Controller from "sap/ui/core/mvc/Controller";

// Base class directly extends a known UI5 controller path.
// Its name doesn't contain "Controller" to test the transitive controller-flag auto-set.
class AppBase extends Controller {
  onInit() {}
}
