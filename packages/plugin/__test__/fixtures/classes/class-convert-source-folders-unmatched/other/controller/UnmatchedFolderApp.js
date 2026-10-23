// sourceFolders unmatched test: sourceFolders = { src: "my.app" }, sourceRoot = <fixture-root>
// The file's leading folder is "other" (NOT a key in sourceFolders).
// An unmatched folder returns empty namespace → namespace guard prevents auto-convert.
// Expected: class stays as a plain ES2015 class (autoConvertKnownUI5Classes requires non-empty namespace).

import Controller from "sap/ui/core/mvc/Controller";

class UnmatchedFolderApp extends Controller {}
