// Dep-lib base class: extends a known UI5 base class.
// Used by PrimaryExtendsDepBase.js in the primary source root to test cross-root
// transitive conversion via the N2 ancestor namespace check.
import Controller from "sap/ui/core/mvc/Controller";

class DepBase extends Controller {}
