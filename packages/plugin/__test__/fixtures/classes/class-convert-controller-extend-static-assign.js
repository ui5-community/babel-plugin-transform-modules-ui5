import SAPController from "sap/SAPController";
/**
 * @name test.fixtures.classes.MyController
 */
export default class MyController extends SAPController {}
const meta = {};
const Formatter = {};
/**
 * This tests finding the metadata after the class declaration.
 * This is how typescript compiles static props.
 */
MyController.metadata = meta;
MyController.renderer = {};
MyController.myFormatter = Formatter;
