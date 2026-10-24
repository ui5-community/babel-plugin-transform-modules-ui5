// N2 isLocalChainConvertible rejection test.
// MyApp lives in "src/" (mapped to "my.app") and extends LocalMid (in "other/", unmapped).
// Even though the transitive chain reaches sap/ui/core/mvc/Controller, the intermediate
// LocalMid has no namespace and is not a .controller.js file, so isLocalChainConvertible
// returns false and MyApp must NOT be converted to .extend() syntax.

import LocalMid from "../other/LocalMid";

class MyApp extends LocalMid {}

export default MyApp;
