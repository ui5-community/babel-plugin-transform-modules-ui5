/* global sap */
/**
 * Test notes: Even though there is an existing sp.ui.define,
 * the class should be converted.
 */
sap.ui.define(['sap/SAPClass'], (SAPClass) => {
  /**
   * @UI5
   * @name com.app.MyClass
   * @namespace com.app
   */
  class MyClass extends SAPClass {
    static renderer = {}
    static metadata = {
      thing: "string"
    }
    constructor(data) {
      // This incorrect shorthand gets fixed
      super(data)
    }
    property_func = () => {
      return this.getProperty('/name')
    }
  }
  return MyClass
})
