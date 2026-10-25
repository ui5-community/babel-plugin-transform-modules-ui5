// autoConvertKnownUI5Classes is explicitly disabled — classes extending known UI5
// base-class paths must NOT be auto-converted. They remain as plain ES2015 classes.

import Controller from "sap/ui/core/mvc/Controller";
import Control from "sap/ui/core/Control";

class MyController extends Controller {}

class MyControl extends Control {}
