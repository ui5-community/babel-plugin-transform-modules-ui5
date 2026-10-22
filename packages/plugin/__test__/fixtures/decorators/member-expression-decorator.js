// Regression guard: a member-expression decorator (@foo.bar / @foo.bar()) on a class
// that extends an import must NOT crash the transform. The decorator's callee is a
// MemberExpression, so it has no resolvable `.name`; groupByName must skip it rather
// than call .toLowerCase() on undefined. The decorator is not a UI5 tag, so it is
// ignored for class-info purposes and left on the class for other plugins.
import Control from "sap/ui/core/Control";

@foo.bar()
export default class My extends Control {}
