// Module with a local UI5 helper and a non-UI5 class exported as default via specifier form.
// `export { AppBase as default }` is an ExportNamedDeclaration, not ExportDefaultDeclaration.
// filesWithDefaultExport must be populated by scanning for the specifier form too.
import Controller from "sap/ui/core/mvc/Controller";

class Helper extends Controller {} // local UI5 helper — NOT the default export

class AppBase {} // non-UI5 class — the actual default export, no superclass

export { AppBase as default };
