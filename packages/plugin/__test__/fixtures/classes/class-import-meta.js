import SAPClass from "sap/SAPClass";

/**
 * @name test.fixtures.classes.MyClass
 */
export default class MyClass extends SAPClass {
  myUrl() {
    return import.meta.url;
  }
  resolveUrl(url) {
    return import.meta.resolve(url);
  }
}
