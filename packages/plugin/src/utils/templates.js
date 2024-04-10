import { template, types as t } from "@babel/core";

const exportName = "__exports";

export const exportsIdentifier = t.identifier(exportName);

export const buildAssign = template(`
  OBJECT.NAME = VALUE;
`);

export const buildDefine = template(`
  sap.ui.define(SOURCES, function (PARAMS) {
    BODY;
  });
`);

export const buildDefineGlobal = template(`
  sap.ui.define(SOURCES, function (PARAMS) {
    BODY;
  }, true);
`);

// Uses 'var' since it gets added during wrap
export const buildDeclareExports = template(`
  var ${exportName} = {
    __esModule: true
  };
`);

// Uses 'var' since it gets added during wrap
export const buildTempExport = template(`
  var ${exportName} = VALUE;
`);

export const buildExportDefault = template(`
  export default VALUE;
`);

export const buildReturnExports = template(`
  return ${exportName};
`);

export function buildNamedExport(obj) {
  return buildAssign({
    OBJECT: exportsIdentifier,
    NAME: obj.key,
    VALUE: obj.value,
  });
}

export const buildAllExportHelper = template(`
  function extendExports(exports, obj) {
    obj && Object.keys(obj).forEach(function (key) {
      if (key === "default" || key === "__esModule") return;
      Object.defineProperty(exports, key, {
        enumerable: true,
        get: function get() {
          return obj[key];
        }
      });
    });
  }
`);

export const buildAllExport = template(`
  extendExports(${exportName}, LOCAL);
`);

export const buildReturn = template(`
  return ID;
`);

export const buildDefaultImportInterop = template(`
  function _interopRequireDefault(obj) { return (obj && obj.__esModule && typeof obj.default !== "undefined") ? obj.default : obj; }
`);

export const buildDefaultImportDeconstructor = template(`
  const LOCAL = _interopRequireDefault(MODULE);
`);

/*
 * Scenarios for dynamic exports:
 *
 * 1.) ES module with no exports
 *
 * (await import("./moduleWithNoExports.js")) ==> Module
 * (await import("./moduleWithNoExports.js")).default ==> undefined
 *
 * 2.) ES module with default export
 *
 * (await import("./moduleWithDefaultExport.js")) ==> Module
 * (await import("./moduleWithDefaultExport.js")).default ==> DefaultExport
 *
 * 3.) ES module with named exports
 *
 * (await import("./moduleWithNamedExport.js")) ==> Module
 * (await import("./moduleWithNamedExport.js")).default ==> undefined
 * (await import("./moduleWithNamedExport.js")).NamedExport ==> NamedExport
 *
 * A Module object is always returned by the dynamic import.
 *
 * ---
 *
 * The dynamic import script template simulates the default and named exports
 * for non-ES modules so that the TypeScript code completion can be properly
 * used. The template below is used to translate dynamic imports to sap.ui.require
 * calls which are typically be used for the following scenarios:
 *
 * 1.) UI5 Libraries
 *
 * A UI5 library exports its complete namespace and all available
 * types/enums/... are accessible as named properties on that
 * namespace, e.g.:
 *
 * (await import("sap/m/library")) => { __esModule: true, ... }
 * (await import("sap/m/library")).default => undefined
 * (await import("sap/m/library")).ButtonType => sap/m/ButtonType
 *
 * 2.) UI5 Classes
 *
 * A UI5 class exports itself as default. When importing a UI5 class
 * it is expected to be accessible via the default property.
 *
 * (await import("sap/m/Button")) => { __esModule: true, ... }
 * (await import("sap/m/Button")).default => sap/m/Button
 *
 * 3.) Static Helpers (sap/m/MessageBox)
 *
 * (await import("sap/m/MessageBox")) => { __esModule: true, ... }
 * (await import("sap/m/MessageBox")).default => sap/m/MessageBox
 * (await import("sap/m/MessageBox")).Action => undefined
 * (await import("sap/m/MessageBox")).default.Action => sap/m/MessageBox.Action
 *
 * 4.) undefined or null (no exports)
 *
 * (await import("./non/exporting/module")) => { __esModule: true, ... }
 * (await import("./non/exporting/module")) => undefined
 *
 * 5.) Other dependencies (jsPDF)
 *
 * (await import("jsPDF")) => { __esModule: true, jsPDF: ?, ... }
 * (await import("sap/m/MessageBox")).jsPDF => jsPDF
 *
 * When requiring other dependencies they are already flagged as __esModule
 * and must not be processed in our dynamic import to require handler.
 */
// TODO: inject __extends instead of Object.assign unless useBuiltIns in set
export const buildDynamicImportHelper = template(`
  function __ui5_require_async(path) {
    return new Promise(function(resolve, reject) {
      sap.ui.require([path], function(module) {
        if (!(module && module.__esModule)) {
          module = module === null || !(typeof module === "object" && path.endsWith("/library")) ? { default: module } : module;
          Object.defineProperty(module, "__esModule", { value: true });
        }
        resolve(module);
      }, function(err) {
        reject(err);
      });
    });
  }
`);

export const buildConstDeclaration = template(`
  const NAME = VALUE;
`);

export const buildNamedImportDestructor = template(`
  const LOCAL = MODULE[IMPORTED];
`);

export const buildExtendAssign = template(`
  const NAME = SUPER.extend(FQN, OBJECT);
`);

// This is use when there is not already the function, so always propagate arguments.
export const buildInheritingFunction = template(`
  function NAME() {
    if (typeof SUPER.prototype.NAME === 'function') {
      SUPER.prototype.NAME.apply(this, arguments);
    }
  }
`);

// This is use when there is not already the function, so always propagate arguments.
export const buildInheritingConstructor = template(`
  function constructor() {
    SUPER.prototype.constructor.apply(this, arguments);
  }
`);
