// Descendant of UIBase, which default-exports a non-UI5 class.
// Although UIBase.js contains a local Helper that extends Controller,
// ZChild should NOT be converted to UIBase.extend() because the class it
// actually imported (UIBase) does not transitively extend a known UI5 base class.

import UIBase from "./UIBase";

export default class ZChild extends UIBase {}
