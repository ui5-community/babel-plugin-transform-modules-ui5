
import SAPClass from "sap/SAPClass"

const Formatter = {};
const mdata = {}

export default class MyClass extends SAPClass {
  metadata = mdata;
  myFormatter = Formatter;
}
