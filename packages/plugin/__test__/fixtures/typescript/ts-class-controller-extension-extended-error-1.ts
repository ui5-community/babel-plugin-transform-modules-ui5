import Controller from "sap/ui/core/mvc/Controller";
import ControllerExtension from "sap/ui/core/mvc/ControllerExtension";
import Routing from "sap/fe/core/controllerextensions/Routing";

/**
 * @namespace test.controller
 */
export default class MyExtendedController extends Controller {
	routing = ControllerExtension.use(); // should throw an error
}