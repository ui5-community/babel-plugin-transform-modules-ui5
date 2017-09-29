/* global sap */
sap.ui.define(['JSONModel'], (JSONModel) => {
  const X = JSONModel.extend('X', {
    constructor (data) { // This incorrect shorthand will get fixed
      JSONModel.prototype.constructor.call(this, data)
    }
  })

  return X
})
