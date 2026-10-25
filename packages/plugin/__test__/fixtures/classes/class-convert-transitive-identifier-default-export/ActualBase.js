// Identifier-style default export: the class is declared normally and then
// exported as default via a separate `export default ClassName` statement.
// recordAncestry must handle this form (not just `export default class Foo {}`).
import Controller from "sap/ui/core/mvc/Controller";

class ActualBase extends Controller {}

export default ActualBase;
