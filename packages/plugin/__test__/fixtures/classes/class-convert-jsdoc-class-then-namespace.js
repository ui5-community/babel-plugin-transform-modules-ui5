import SAPClass from "sap/SAPClass";

/**
 * The `@class` tag with no name historically caused `doctrine` to bail and miss
 * subsequent tags. Verifies the parser keeps going.
 *
 * @class
 * @namespace x.y
 * @controller
 */
export default class MyClass extends SAPClass {}
