import Controller from "sap/ui/core/mvc/Controller";
import ControllerExtension from "sap/ui/core/mvc/ControllerExtension";
import Routing from "sap/fe/core/controllerextensions/Routing";

/**
 * @namespace test.controller
 */
export default class MyExtendedController extends Controller {
	routing = ControllerExtension.use(Routing.override({}));
	routing2 = (Routing as any).use(Routing.override({})); // should not even try to handle this
	routing3 = Controller.use(Routing.override({})); // should not even try to handle this
}