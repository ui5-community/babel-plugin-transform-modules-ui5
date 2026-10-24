// Intermediate ancestor in the isLocalChainConvertible test.
// Has an explicit default export (AppBase) with no superclass, plus a sibling UI5 class (Helper).
// filesWithDefaultExport must block the key-scan fallback so GrandChild's chain is not
// incorrectly allowed via Helper's Controller ancestry.

import Controller from "sap/ui/core/mvc/Controller";

class Helper extends Controller {} // local UI5 helper — NOT the default export

export default class AppBase {} // actual default export, no superclass
