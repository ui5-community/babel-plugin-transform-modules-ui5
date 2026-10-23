// sourceFolders test: sourceFolders = { src: "my.app" }, sourceRoot = <fixture-root>
// The file's leading folder is "src" (matched in sourceFolders).
// sourceFolders strips "src" and applies prefix "my.app", leaving "controller" as dir.
// Expected FQN: "my.app.controller.SourceFolderApp"

import Controller from "sap/ui/core/mvc/Controller";

class SourceFolderApp extends Controller {}
