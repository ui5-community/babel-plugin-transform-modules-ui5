// Imports the default export of MixedModule under the alias "Helper" — the same name
// as the local UI5 helper inside MixedModule. Should NOT be converted: the imported
// class (AppBase) does not transitively extend a known UI5 base.
import Helper from "./MixedModule";

export default class ZChild extends Helper {}
