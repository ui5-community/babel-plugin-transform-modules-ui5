
import Controller from 'sap/ui/core/Controller'
import Relative from './Relative'

/**
 * @hello
 */
export default class MyController extends Controller {
  metadata = {}
  renderer = {}
  constructor(arg) {
    console.log("constructor")
    super(arg)
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

MyController.z = function() {
  return 'hey'
}