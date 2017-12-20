
sap.ui.define(['sap/SAPClass'], (SAPClass) => {
  const Formatter = {};
  const meta = {}
  /**
   * @name x.y.MyClass
   */
  class MyClass extends SAPClass {}
  MyClass.myFormatter = Formatter;
  MyClass.metadata = meta;
  MyClass.renderer = {}
  return MyClass
})
