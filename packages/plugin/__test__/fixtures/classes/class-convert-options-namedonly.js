/**
 * This test uses config options to only convert if there is a name provided.
 */
sap.ui.define(["other/OtherClass", "sap/SAPClass"], (OtherClass, SAPClass) => {
  return class MyClass extends OtherClass {
    constructor() {
      super();
    }
  };

  /**
   * @name my.app.MyUI5Class
   */
  return class MyUI5Class extends SAPClass {
    constructor() {
      super();
    }
  };
});
