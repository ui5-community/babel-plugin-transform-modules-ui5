import * as Util from "./lib/util";
import Controller from "sap/ui/core/mvc/Controller";

/**
 * @name app.AppController
 * @controller
 */
class AppController extends Controller {
  static metadata = {
    /* ... */
  };
  No = "not this";
  No2 = Util.callback(function() {
    this.notThis();
  });
  control = this.byId("control");
  controlCopy = this.control;

  boundSomething = this.something.bind(this);

  boundSomething2 = this.something.bind(null, this);
  boundSomething3 = Util.something.bind(this);

  arrowFunctionMember = () => {
    this.something();
  };
  arrowFunctionArgument = () => {
    Object.something(1, this);
  };
  arrowFunctionNested = Util.debounce(100, () => {
    setTimeout(() => {
      this.something();
    });
  });
}

export default AppController;
