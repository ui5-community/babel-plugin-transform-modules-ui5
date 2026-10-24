// dependencies test: primary sourceRoot = <fixture-root>/primary (does NOT contain this file)
// dependencies[0] = { sourceRoot: <fixture-root>/dep-lib, sourceFolders: { src: "my.dep" } }
// The file's leading folder inside dep-lib is "src" (matched in dep sourceFolders).
// sourceFolders strips "src" and applies prefix "my.dep", leaving "controller" as dir.
// Expected FQN: "my.dep.controller.DepMappedApp"

import Controller from "sap/ui/core/mvc/Controller";

class DepMappedApp extends Controller {}
