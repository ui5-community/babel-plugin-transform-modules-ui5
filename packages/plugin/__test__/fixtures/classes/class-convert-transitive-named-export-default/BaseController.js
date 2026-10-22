// Named export of the class + identifier-style default export.
// recordAncestry must unwrap ExportNamedDeclaration to see the class declaration,
// so that the identifier-style default export pass can find Base in localClassSuperMap
// and record the "\0default" sentinel.
import Controller from "sap/ui/core/mvc/Controller";

export class Base extends Controller {}

export default Base;
