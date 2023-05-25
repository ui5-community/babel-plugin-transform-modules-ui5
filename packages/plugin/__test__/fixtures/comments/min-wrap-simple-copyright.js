/*!
 * ${copyright}
 */
const x = 1; // This should not be part of sap-ui-define

import Foo from "./foo";

const y = Foo(x); // This gets wrapped

export default y;
