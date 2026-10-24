// autoConvertControllerClass: false suppresses the .controller.(js|ts) suffix auto-detection.
// The class should remain a plain ES class — no .extend() conversion.

import Controller from "sap/ui/core/mvc/Controller";

export default class AppPage extends Controller {
  onInit() {}
}
