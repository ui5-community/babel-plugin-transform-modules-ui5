// Middle ancestor with no namespace: lives in "other/" which is not mapped in sourceFolders,
// so deriveNamespaceForFile returns "" for this file. It extends a known UI5 base class
// directly but cannot itself be converted to .extend() without a namespace.

import Controller from "sap/ui/core/mvc/Controller";

class LocalMid extends Controller {}

export default LocalMid;
