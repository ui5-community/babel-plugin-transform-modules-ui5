/**
 * This test uses config options to never convert.
 */
sap.ui.define(["other/OtherClass"], (OtherClass) => {
  return class MyClass extends OtherClass {
    constructor() {
      super()
    }
  }
})
