import Controller from "sap/ui/core/mvc/Controller";
import ControllerExtension from "sap/ui/core/mvc/ControllerExtension";
import Routing from "sap/fe/core/controllerextensions/Routing";

/**
 * @namespace test.controller
 */
export default class MyExtendedController extends Controller {
	routing: Routing = ControllerExtension.use(Routing.override({}));
	routing2: Routing = ControllerExtension.use(Routing.override({
		x: 1,
		fn: () => { }
	}));
}