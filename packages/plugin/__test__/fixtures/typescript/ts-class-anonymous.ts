import SAPClass from "sap/Class";
import IClipboardContent from "sap/IClipboardContent";

/**
 * @name MyClass
 */
export default class MyClass extends SAPClass {
  createAnonymousClass() {
    return new (class implements IClipboardContent {
      getClipboardContentType() {
        /* ... */
      }
    })();
  }
}
