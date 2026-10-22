// Same as import-remove-fileext.js but with suppressImportResolutionHints: true.
// The transformed output is identical (the option only silences the console hint
// logged when a resolvable local ".js" extension is stripped); this fixture exists to
// cover the option and ensure it does not alter the transformation result.
import "./_private_/module_js.js";
import "./_private_/module_jsx.js";
import "./_private_/module_ts.js";
import "./_private_/module_tsx.js";
import "./_private_/unknown_module.js";
