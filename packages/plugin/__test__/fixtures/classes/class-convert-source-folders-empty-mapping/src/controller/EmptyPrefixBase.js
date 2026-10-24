// sourceFolders: { src: "" } (empty-string mapped prefix, meaning "src" is stripped with no prefix).
// EmptyPrefixBase directly extends a known UI5 class.
// Expected FQN: "controller.EmptyPrefixBase" ("src" stripped, "" prefix omitted, dir is "controller")

import Controller from "sap/ui/core/mvc/Controller";

class EmptyPrefixBase extends Controller {}
