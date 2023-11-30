import Controller from "sap/ui/core/mvc/Controller";
import Routing from "sap/fe/core/controllerextensions/Routing";

/**
 * @namespace test.controller
 */
export default class MyExtendedController extends Controller {

	@transformControllerExtension
	routing: Routing;

}