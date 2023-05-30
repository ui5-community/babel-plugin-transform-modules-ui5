import Controller from "sap/ui/core/mvc/Controller";
import { mixin } from "../lib/decorators";
import RoutingSupport from "../lib/RoutingSupport";

@namespace("example.controller")
@mixin(RoutingSupport)
export default class AppController extends Controller {
  /* ... */
}
