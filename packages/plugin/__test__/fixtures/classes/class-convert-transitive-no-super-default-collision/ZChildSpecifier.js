// Imports the default export of MixedModuleSpecifier (AppBase, no superclass) under alias "Helper".
// Must NOT be converted — the default export has no UI5 ancestry.
import Helper from "./MixedModuleSpecifier";

export default class ZChildSpecifier extends Helper {}
