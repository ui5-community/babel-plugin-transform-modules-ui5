import Controller from "sap/ui/core/mvc/Controller";
import CtrlEx from "sap/ui/core/mvc/ControllerExtension";
import Routing from "sap/fe/core/controllerextensions/Routing";

/**
 * @namespace test.controller
 */
export default class MyExtendedController extends Controller {
	routing = /* comment */ CtrlEx.use(
		/* comment */
		Routing.override(
			/* comment */
			{
				/* comment */
			}
		));
}