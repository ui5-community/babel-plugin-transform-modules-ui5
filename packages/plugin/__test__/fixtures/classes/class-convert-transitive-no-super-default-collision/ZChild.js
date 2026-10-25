// Imports the default export of MixedModule under the alias "Helper" — the same name
// as the local UI5 helper inside MixedModule. The default export (AppBase) has no
// superclass, so ZChild must NOT be converted.
import Helper from "./MixedModule";

export default class ZChild extends Helper {}
