
import SAPClass from 'sap/ui/core/SAPClass'
import Relative from './Relative'

export default class MyClass extends SAPClass {
  metadata = {}
  renderer = {}
  constructor(arg) {
    console.log("constructor")
    super(arg)
    this.x = 1
  }
  get prop() {
    return 1
  }
  set prop(val) {
    this.x = val
  }
  shorthand_function(...args) {
    super.foo(...args)
    this.name = Relative.name()
  }
  async async_shorthand_function(arg) {
    return await 1
  }
  property_value = 1
  property_arrow_function = () => 1
  static static_shorthand_function() {
    return 1
  }
  static static_property_value = 1
  static static_property_arrow = () => 1
  static async static_async_shorthand_function() {
    return await 1
  }
}

MyClass.z = function() {
  return 'hey'
}
