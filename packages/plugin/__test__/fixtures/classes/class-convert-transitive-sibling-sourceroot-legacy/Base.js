// This ancestor lives in a SIBLING directory of sourceRoot:
//   sourceRoot        = .../class-convert-transitive-sibling-sourceroot
//   this file's dir   = .../class-convert-transitive-sibling-sourceroot-legacy
// The sibling path shares sourceRoot as a string prefix, so the old
// `ancestorFile.startsWith(sourceRoot)` containment check wrongly treated it as
// INSIDE sourceRoot and computed a bogus namespace for it. The Path.relative-based
// check correctly classifies it as outside (relative path begins with "..").
import Controller from "sap/ui/core/mvc/Controller";

export default class Base extends Controller {}
