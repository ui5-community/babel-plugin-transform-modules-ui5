// Named-export with default specifier form, where the exported class extends a known UI5 base.
// The "\0default" sentinel must be recorded so descendants can convert transitively.
import Controller from "sap/ui/core/mvc/Controller";

class UIBase extends Controller {}

export { UIBase as default };
