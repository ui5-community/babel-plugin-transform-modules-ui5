import Controller from "sap/ui/core/mvc/Controller";
import ControllerExtension from "sap/ui/core/mvc/ControllerExtension";
import Routing from "sap/fe/core/controllerextensions/Routing";

const cov_1uvvg22e7l = () => { return { "s": {} }; }; // dummy coverage function

/**
 * @namespace test.controller
 */
export default class MyExtendedController extends Controller {

	// code could already be instrumented, e.g. for code coverage by istanbul, and look like this:
	//this.routing = (cov_1uvvg22e7l().s[5]++, ControllerExtension.use(Routing.override({ … })));
	routing = (cov_1uvvg22e7l().s[5]++, ControllerExtension.use(Routing));
	routing2 = (cov_1uvvg22e7l().s[5]++, ControllerExtension.use(Routing.override({})));
	routing3 = (cov_1uvvg22e7l().s[5]++, cov_1uvvg22e7l().s[5]++, ControllerExtension.use(Routing.override({})));
}