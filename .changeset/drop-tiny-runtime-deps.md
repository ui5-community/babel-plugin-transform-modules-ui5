---
"babel-plugin-transform-modules-ui5": patch
---

Drop three small, single-purpose runtime dependencies in favor of built-ins:

- `array-flatten` → `Array.prototype.flat(Infinity)`
- `ignore-case` → `String.prototype.toLowerCase()` comparison
- `object-assign-defined` → inlined 8-line helper

No change in behavior; the plugin's runtime now ships only with `doctrine`
as a production dependency.
