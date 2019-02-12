import SAPClass from "sap/SAPClass";

/**
 * @name my.MyClass
 */
export default class AClass extends SAPClass {
  delay() {
    return new Promise(resolve => {
      setTimeout(resolve);
    });
  }
  includes(str) {
    return str.includes("thing");
  }
}
