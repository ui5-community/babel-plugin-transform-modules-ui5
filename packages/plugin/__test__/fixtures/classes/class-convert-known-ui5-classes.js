// This fixture tests autoConvertKnownUI5Classes: true
// A class extending a known UI5 base class is auto-converted without any annotation.

import Controller from "sap/ui/core/mvc/Controller";
import ManagedObject from "sap/ui/base/ManagedObject";
import Control from "sap/ui/core/Control";

class MyController extends Controller {}

class MyModel extends ManagedObject {}

class MyControl extends Control {}
