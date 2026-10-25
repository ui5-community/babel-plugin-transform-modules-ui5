// This file has two classes:
//  - Helper: a local-only class extending a known UI5 class (NOT the default export)
//  - UIBase: the default export, which extends a plain NativeBase (NOT a UI5 class)
//
// Before the fix, isSuperclassTransitivelyKnown would follow the first recorded
// superclass entry for this file (Helper's Controller import) and wrongly conclude
// that UIBase is a known UI5 class.  After the fix it follows the default-export's
// superclass (NativeBase → not in the known list) and correctly returns false.

import Controller from "sap/ui/core/mvc/Controller";
import NativeBase from "./NativeBase";

// Local helper — extends a known UI5 class but is NOT the default export.
class Helper extends Controller {}

// Default export — extends a plain non-UI5 base.
export default class UIBase extends NativeBase {}
