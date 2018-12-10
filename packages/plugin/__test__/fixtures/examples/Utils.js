export function multiply(a, b) {
  return a * b;
}

function add(a, b) {
  // Not a named export but gets added for sap.ui.define() interop.
  return a + b;
}

export default {
  multiply,
  add,
};
