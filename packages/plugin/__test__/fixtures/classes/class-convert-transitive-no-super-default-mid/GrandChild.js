// GrandChild extends ZChild (which is not converted, since ZChild's ancestor MixedMid
// exports a non-UI5 default). isLocalChainConvertible must reject this chain: MixedMid
// is in filesWithDefaultExport with no \0default sentinel, so it must stop there rather
// than falling back to Helper's Controller ancestry. GrandChild must NOT be converted.
import ZChild from "./ZChild";

export default class GrandChild extends ZChild {}
