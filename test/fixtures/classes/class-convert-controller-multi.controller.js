
// This fixture tests the detection of .controller.js files
// and the option to auto-convert these controllers by default.

import SAPController from "sap/ui/core/Controller"
import Other from "other"

class MyController extends SAPController {

}

class Controller2 extends SAPController {

}

/**
 * @nonui5
 */
class NotUI5 extends Other {

}
