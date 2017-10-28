/* global sap */
/**
 * Test notes: Even though there is an existing sp.ui.define,
 * and it uses .extend() syntax, the constructor function should be fixed.
 */
sap.ui.define(['sap/SAPClass'], (SAPClass) => {
  const X = SAPClass.extend('X', {
    // This incorrect shorthand will get fixed
    constructor (data) {
      SAPClass.prototype.constructor.call(this, data)
    },
    method() {
      return this.getProperty('/name')
    }
  })
  return X
})
