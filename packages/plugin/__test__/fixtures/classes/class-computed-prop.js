import Controller from "sap/class";

const name = Symbol("_name");

/**
 * @name my.TestController
 * @controller
 */
class Test extends Controller {
  [name] = null;
  [name] = 1;
  [name] = function() {};
  [name] = async function() {};
  [name] = () => {};
  [name] = async () => {};

  static [name] = null;
  static [name] = 2;
  static [name] = () => {};
  static [name] = function() {};
  static [name] = async () => {};
  static [name] = async function() {};
}

export default Test;
