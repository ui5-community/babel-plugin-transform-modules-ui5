// TypeScript ancestor using the legacy angle-bracket type assertion syntax.
// `const x = <SomeType>input` is valid TypeScript but invalid JSX — enabling JSX
// for this file causes a parse failure, silently discarding ancestry data and
// preventing descendants from being auto-converted.
import Controller from "sap/ui/core/mvc/Controller";

class BaseController extends Controller {
  init() {
    const input: unknown = "test";
    const value = <string>input; // legacy TS type assertion — breaks JSX parser
    return value;
  }
}

export default BaseController;
