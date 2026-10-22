// This module has two classes:
//  - Helper: a local-only UI5 class that is NOT the default export
//  - AppBase: the default export, which extends a plain non-UI5 class
//
// Before the N1 fix, `import Helper from "./MixedModule"` in a descendant
// would match the local `class Helper extends Controller` (same name as the
// import alias) and wrongly produce a conversion. After the fix, default
// imports exclusively use the "\0default" sentinel, which points to AppBase's
// non-UI5 superclass — correctly returning null.
import Controller from "sap/ui/core/mvc/Controller";
import NativePlatform from "./NativePlatform";

class Helper extends Controller {} // local UI5 helper — NOT the default export

class AppBase extends NativePlatform {} // the actual default export

export default AppBase;
