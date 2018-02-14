
import SAPClass from "sap/SAPClass"
export default class MyClass extends SAPClass {}
const meta = {}
const Formatter = {}
/**
 * This tests finding the metadata after the class declaration.
 * This is how typescript compiles static props.
 */
MyClass.metadata = meta;
MyClass.renderer = {}
MyClass.myFormatter = Formatter;
