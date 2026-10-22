// Imports the function default export of MixedModuleFunction under the alias "Helper".
// Must NOT be converted because the default export is a function, not a UI5 class.
import Helper from "./MixedModuleFunction";

export default class ZChildFunction extends Helper {}
