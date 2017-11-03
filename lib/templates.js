
import template from 'babel-template'

export const buildAssign = template(`
  OBJECT.NAME = VALUE;
`)

export const buildDefine = template(`
  sap.ui.define([SOURCES], function (PARAMS) {
    BODY;
  });
`)

export const buildDefineGlobal = template(`
  sap.ui.define([SOURCES], function (PARAMS) {
    BODY;
  }, true);
`)

export const buildDeclareExports = template(`
  const exports = {};
`)

export const buildExportsModuleDeclaration = template(`
  Object.defineProperty(exports, "__esModule", {
    value: true
  });
`)

// TODO get this one to use buildAssign
export const buildNamedExport = template(`
  exports.EXPORTED = LOCAL;
`)

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
`)

export const buildAllExport = template(`
  extendExports(exports, LOCAL);
`)

export const buildReturn = template(`
  return ID;
`)

export const buildDefaultImportInterop = template(`
  function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj.default : obj; }
`)

export const buildDefaultImportDestructor = template(`
  const LOCAL = _interopRequireDefault(MODULE);
`)

export const buildConstDeclaration = template(`
  const NAME = VALUE;
`)

export const buildNamedImportDestructor = template(`
  const LOCAL = MODULE[IMPORTED];
`)

export const buildExtendAssign = template(`
  const NAME = SUPERNAME.extend(FQN, OBJECT);
`)

// TODO get this one to use buildAssign
export const buildThisAssisment = template(`
  this.NAME = VALUE;
`)

export const buildDefaultConstructorFunction = template(`
  function contructor() {
    SUPER.prototype.contructor.apply(this, arguments);
  }
`)
