// Namespace guard test: autoConvertKnownUI5Classes is true, but the sourceRoot for this
// fixture is set to this directory itself, making fileNamespace resolve to "". The namespace
// guard in shouldConvertClass requires a non-empty fileNamespace for auto-conversion, so
// this class must remain as a plain ES2015 class even though it extends a known UI5 base.

import Controller from "sap/ui/core/mvc/Controller";

class MyController extends Controller {}
