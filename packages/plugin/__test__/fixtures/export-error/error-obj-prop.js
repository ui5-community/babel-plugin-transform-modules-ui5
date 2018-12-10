// This tests the scenario when there is a mix of named and default exports.
// If the importing module has an interop, there"s no issue with that.
// But if not, the importing module will get the "exports" object and not the "default" object.
// If the "exports" doesn"t have all the properties that "default" has, the importing module will get an unexpected undefined.

export function a() {
  return "a";
}

function b() {
  return "b";
}

export default {
  a: b, // conflicting definition from the named export a
};
