
import SAPController from "sap/SAPClass"

const Formatter = {};

/**
 * @name test.fixtures.classes.MyController
 */
export default class MyController extends SAPController {
  static metadata = {};
  static myFormatter = Formatter;
}
