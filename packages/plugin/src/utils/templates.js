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
    Object.keys(obj).forEach(function (key) {
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

// TODO: inject __extends instead of Object.assign unless useBuiltIns in set
export const buildDynamicImportHelper = template(`
  function __ui5_require_async(path) {
    return new Promise((resolve, reject) => {
      sap.ui.require([path], (module) => {
        if (!module) { 
          return reject("No module returned from " + path); 
        } else if (module.__esModule) { 
          return resolve(module); 
        } else if (module.default) {
          return reject(new Error(path + " module includes a 'default' property but not __esModule. Cannot use as dynamic import"));
        } else {
          module.default = typeof module === "object" ? Object.assign({}, module) : module;
          module.__esModule = true;
          resolve(module);
        }
      })
    })
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

export const buildExtendAssignWithMD = template(`
  const NAME = SUPER.extend(FQN, OBJECT, FN_META_IMPL);
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
