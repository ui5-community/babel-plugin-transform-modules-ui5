// ZBase sorts alphabetically after AChild, so it is processed LAST by the test runner.
// Without on-demand ancestor reading, AChild would be transformed before ZBase is cached,
// causing transitive detection to fail. With readAndRecordFile, AChild's transform reads
// ZBase from disk on demand and correctly detects the UI5 ancestry.
import Controller from "sap/ui/core/mvc/Controller";

export default class ZBase extends Controller {}
