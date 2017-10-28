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
  return class MyClass extends SAPClass {
    static renderer = {}
    static metadata = {
      thing: "string"
    }
    // This incorrect shorthand will get fixed
    constructor (data) {
      super(data)
    }
    // TODO this should be converted to a bound function
    property_func = () => {
      return this.getProperty('/name')
    }
  }
})
