// Regression guard: a recognised value-tag decorator used WITHOUT a call — `@alias`
// instead of `@alias("...")` — must NOT crash the transform. decorator.expression is
// an Identifier with no `.arguments`, so getDecoratorValue must guard before indexing
// [0] rather than throwing. With no argument there is no alias value, so the class is
// treated as if the tag were absent.
import Control from "sap/ui/core/Control";

@alias
export default class My extends Control {}
