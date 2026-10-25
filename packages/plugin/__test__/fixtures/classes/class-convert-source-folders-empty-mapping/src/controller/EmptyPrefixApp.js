// sourceFolders: { src: "" } (empty-string mapped prefix, meaning "src" is stripped with no prefix).
// EmptyPrefixApp extends EmptyPrefixBase which extends sap/ui/core/mvc/Controller.
// Exercises transitive detection when sourceFolders maps the leading folder to "".
// Expected FQN: "controller.EmptyPrefixApp"

import EmptyPrefixBase from "./EmptyPrefixBase";

class EmptyPrefixApp extends EmptyPrefixBase {}
