// dependencies test: primary sourceRoot = <fixture-root>/primary (does NOT contain this file)
// dependencies[0] = { sourceRoot: <fixture-root>/dep-lib, sourceFolders: { src: "my.dep" } }
// The file's leading folder inside dep-lib is "other" (NOT mapped in dep sourceFolders).
// An unmapped dep folder returns "" namespace → namespace guard prevents auto-convert.
// Expected: class stays as a plain ES2015 class.

import Controller from "sap/ui/core/mvc/Controller";

class DepUnmappedApp extends Controller {}
