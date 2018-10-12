
import SAPClass from "sap/SAPClass"

const Formatter = Formatter
const mdata = {}

/**
 * @name test.fixtures.classes.MyClass
 */
export default class MyClass extends SAPClass {
  static metadata = mdata;
  static myFormatter = Formatter;
}
