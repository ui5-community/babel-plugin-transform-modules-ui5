
import SAPClass from "sap/SAPClass"

const Formatter = {};
const mdata = {}

/**
 * @name test.fixtures.classes.MyClass
 */
export default class MyClass extends SAPClass {
  metadata = mdata;
  myFormatter = Formatter;
}
