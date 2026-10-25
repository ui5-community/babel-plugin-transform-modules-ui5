import { saveImports } from "./helpers/imports";

// Must be a regular function (not arrow) so Babel's plugin lifecycle sets `this` to the
// plugin state object, giving access to this.opts (the plugin options).
export function ClassPre(file) {
  saveImports(file, this.opts?.additionalUI5Classes);
}
