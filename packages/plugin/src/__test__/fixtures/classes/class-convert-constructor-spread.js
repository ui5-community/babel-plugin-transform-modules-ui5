/* global sap */
/**
 * Test notes: Even though there is an existing sp.ui.define,
 * the class should be converted.
 */
sap.ui.define(["sap/SAPClass"], (SAPClass) => {
  /**
   * @name com.app.MyClass
   */
  return class MyClass extends SAPClass {
    constructor(...args) {
      super(...args)
    }
  }
})
