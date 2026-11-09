---
"babel-plugin-transform-modules-ui5": patch
---

Fix default re-exports (`export { default as X } from "./Mod"` and `export { default } from "./Mod"`) to use the same import interop as default imports, including modules that return their default value directly. Preserve dependency aliases when imports and re-exports share a source, regardless of declaration order. Producer export shapes and interop opt-out behavior remain unchanged.
