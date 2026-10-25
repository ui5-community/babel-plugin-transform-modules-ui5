// Direct child of MixedMid. Has a namespace (namespacePrefix), imports the default export
// under the alias "Helper" (same name as the local UI5 sibling in MixedMid).
// isLocalChainConvertible walking GrandChild's chain reaches MixedMid, sees it is in
// filesWithDefaultExport with no \0default sentinel — and must NOT fall through to the
// key scan. GrandChild must not be converted.
import Helper from "./MixedMid";

export default class ZChild extends Helper {}
