// Module with a local UI5 helper and a function declaration as the default export.
// Function declarations are never class nodes, so they never reach localClassSuperMap.
// filesWithDefaultExport must be set by the upfront scan so the by-name fallback
// is suppressed and ZChild is NOT converted.
import Controller from "sap/ui/core/mvc/Controller";

class Helper extends Controller {} // local UI5 helper — NOT the default export

// eslint-disable-next-line func-style
export default function NativeBase() {} // function default export — not a class
