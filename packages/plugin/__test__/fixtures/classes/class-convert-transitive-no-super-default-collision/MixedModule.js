// This module has two classes:
//  - Helper: a local-only UI5 class that is NOT the default export
//  - AppBase: the default export, which has NO superclass at all
//
// Before this fix, `import Helper from "./MixedModule"` in a descendant
// would fall back to the by-name lookup (finding the local UI5 Helper sibling)
// because the "\0default" sentinel was never stored for a default-exported class
// with no imported superclass. After the fix, filesWithDefaultExport blocks
// the by-name fallback — correctly returning null so ZChild is not converted.
import Controller from "sap/ui/core/mvc/Controller";

class Helper extends Controller {} // local UI5 helper — NOT the default export

export default class AppBase {} // actual default export, no superclass
