// This fixture tests additionalUI5Classes — user-supplied base class paths.
// A class extending a custom base class is auto-converted when its module path
// is listed in additionalUI5Classes.

import BaseController from "my/app/BaseController";

class MyController extends BaseController {}
