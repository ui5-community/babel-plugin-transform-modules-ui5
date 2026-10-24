// This fixture tests autoConvertKnownUI5Classes with named (non-default) imports.
// import { ControllerExtension } from "..." should trigger auto-detection just like
// a default import would. The ImportSpecifier visitor registers the local binding
// name so doesClassExtendFromImport can find it.

import { ControllerExtension } from "sap/ui/core/mvc/ControllerExtension";
import { ManagedObject as MO } from "sap/ui/base/ManagedObject";

class MyExtension extends ControllerExtension {}

class MyModel extends MO {}
