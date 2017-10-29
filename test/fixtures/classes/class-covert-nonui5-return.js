/**
 * This fixture tests a nonui5 scenario inside an sap.ui.define.
 */
sap.ui.define(['sap/SAPClass'], (SAPClass) => {
 /**
  * @nonui5
  */
 return class MyClass extends SAPClass {}
})
