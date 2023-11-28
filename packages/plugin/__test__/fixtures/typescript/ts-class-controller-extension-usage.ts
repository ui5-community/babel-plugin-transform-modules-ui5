import Controller from "sap/ui/core/mvc/Controller";
import Routing from "sap/fe/core/controllerextensions/Routing";
import { OtherExtension } from "sap/fe/core/controllerextensions/OtherExtension";
import * as ThirdExtension from "sap/fe/core/controllerextensions/ThirdExtension";
import { SomethingElse, AlmostRemovedExtension } from "sap/fe/core/controllerextensions/DoubleExportExtension";
import * as extensionCollection from "sap/fe/core/controllerextensions/ManyExtensions";

/**
 * @namespace test.controller
 */
export default class MyExtendedController extends Controller {

	/**
	 * @transformControllerExtension
	 */
	routing: Routing;

	// @transformControllerExtension
	other: OtherExtension;

	// @transformControllerExtension
	third: ThirdExtension;

	// @transformControllerExtension
	fourth: AlmostRemovedExtension;

	// @transformControllerExtension
	fifth: extensionCollection.group.OneOfManyExtensions;

	realPropertyExtension;

	constructor() {
		super();

		this.realPropertyExtension = SomethingElse.Something;
	}
}