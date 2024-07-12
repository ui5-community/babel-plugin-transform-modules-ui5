import Controller from "sap/ui/core/mvc/Controller";
import Routing from "sap/fe/core/controllerextensions/Routing";
import { OtherExtension } from "sap/fe/core/controllerextensions/OtherExtension";
import * as ThirdExtension from "sap/fe/core/controllerextensions/ThirdExtension";
import { SomethingElse, AlmostRemovedExtension } from "sap/fe/core/controllerextensions/DoubleExportExtension";
import * as extensionCollection from "sap/fe/core/controllerextensions/ManyExtensions";
import ControllerExtension from "sap/ui/core/mvc/ControllerExtension";

/**
 * @namespace test.controller
 */
export default class MyExtendedController extends Controller {

	routing = ControllerExtension.use(Routing);

	other = ControllerExtension.use(OtherExtension);

	third = ControllerExtension.use(ThirdExtension);

	fourth = ControllerExtension.use(AlmostRemovedExtension);

	fifth = ControllerExtension.use(extensionCollection.group.OneOfManyExtensions);

}