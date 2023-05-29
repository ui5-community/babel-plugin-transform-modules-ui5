import Controller from "sap/ui/core/mvc/Controller";
import { mixin } from "../lib/decorators";
import RoutingSupport from "../lib/RoutingSupport";

@mixin(RoutingSupport)
export default class AppController extends Controller {
  /* ... */
}
