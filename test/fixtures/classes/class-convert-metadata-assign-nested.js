
sap.ui.define(['sap/SAPClass'], (SAPClass) => {
  const meta = {}
  /**
   * @name x.y.MyClass
   */
  class MyClass extends SAPClass {}
  MyClass.metadata = meta;
  MyClass.renderer = {}
  return MyClass
})
