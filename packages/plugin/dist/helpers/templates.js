"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.buildNamedExport = buildNamedExport;
exports.buildInheritingConstructor = exports.buildInheritingFunction = exports.buildThisAssignment = exports.buildExtendAssign = exports.buildNamedImportDestructor = exports.buildConstDeclaration = exports.buildDynamicImportHelper = exports.buildDefaultImportDestructor = exports.buildDefaultImportInterop = exports.buildReturn = exports.buildAllExport = exports.buildAllExportHelper = exports.buildReturnExports = exports.buildTempExport = exports.buildDeclareExports = exports.buildDefineGlobal = exports.buildDefine = exports.buildAssign = exports.exportsIdentifier = void 0;

var _core = require("@babel/core");

const exportName = "__exports";

const exportsIdentifier = _core.types.identifier(exportName);

exports.exportsIdentifier = exportsIdentifier;
const buildAssign = (0, _core.template)(`
  OBJECT.NAME = VALUE;
`);
exports.buildAssign = buildAssign;
const buildDefine = (0, _core.template)(`
  sap.ui.define(SOURCES, function (PARAMS) {
    BODY;
  });
`);
exports.buildDefine = buildDefine;
const buildDefineGlobal = (0, _core.template)(`
  sap.ui.define(SOURCES, function (PARAMS) {
    BODY;
  }, true);
`);
exports.buildDefineGlobal = buildDefineGlobal;
const buildDeclareExports = (0, _core.template)(`
  const ${exportName} = {
    __esModule: true
  };
`);
exports.buildDeclareExports = buildDeclareExports;
const buildTempExport = (0, _core.template)(`
  const ${exportName} = VALUE;
`);
exports.buildTempExport = buildTempExport;
const buildReturnExports = (0, _core.template)(`
  return ${exportName};
`); // export const buildExportsModuleDeclaration = template(`
//   Object.defineProperty(${exportString}, "__esModule", {
//     value: true
//   });
// `)

exports.buildReturnExports = buildReturnExports;

function buildNamedExport(obj) {
  // console.log(obj);
  return buildAssign({
    OBJECT: exportsIdentifier,
    NAME: obj.key,
    VALUE: obj.value
  });
}

const buildAllExportHelper = (0, _core.template)(`
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
exports.buildAllExportHelper = buildAllExportHelper;
const buildAllExport = (0, _core.template)(`
  extendExports(${exportName}, LOCAL);
`);
exports.buildAllExport = buildAllExport;
const buildReturn = (0, _core.template)(`
  return ID;
`);
exports.buildReturn = buildReturn;
const buildDefaultImportInterop = (0, _core.template)(`
  function _interopRequireDefault(obj) { return (obj && obj.__esModule && typeof obj.default !== "undefined") ? obj.default : obj; }
`);
exports.buildDefaultImportInterop = buildDefaultImportInterop;
const buildDefaultImportDestructor = (0, _core.template)(`
  const LOCAL = _interopRequireDefault(MODULE);
`); // TODO: inject __extends instead of Object.assign unless useBuiltIns in set

exports.buildDefaultImportDestructor = buildDefaultImportDestructor;
const buildDynamicImportHelper = (0, _core.template)(`
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
exports.buildDynamicImportHelper = buildDynamicImportHelper;
const buildConstDeclaration = (0, _core.template)(`
  const NAME = VALUE;
`);
exports.buildConstDeclaration = buildConstDeclaration;
const buildNamedImportDestructor = (0, _core.template)(`
  const LOCAL = MODULE[IMPORTED];
`);
exports.buildNamedImportDestructor = buildNamedImportDestructor;
const buildExtendAssign = (0, _core.template)(`
  const NAME = SUPERNAME.extend(FQN, OBJECT);
`); // TODO: get this one to use buildAssign

exports.buildExtendAssign = buildExtendAssign;
const buildThisAssignment = (0, _core.template)(`
  this.NAME = VALUE;
`); // export const buildDefaultConstructorFunction = template(`
//   function constructor() {
//     SUPER.prototype.constructor.apply(this, arguments);
//   }
// `)
// This is use when there is not already the function, so always propagate arguments.

exports.buildThisAssignment = buildThisAssignment;
const buildInheritingFunction = (0, _core.template)(`
  function NAME() {
    if (typeof SUPER.prototype.NAME === 'function') {
      SUPER.prototype.NAME.apply(this, arguments);
    }
  }
`); // This is use when there is not already the function, so always propagate arguments.

exports.buildInheritingFunction = buildInheritingFunction;
const buildInheritingConstructor = (0, _core.template)(`
  function constructor() {
    SUPER.prototype.constructor.apply(this, arguments);
  }
`);
exports.buildInheritingConstructor = buildInheritingConstructor;