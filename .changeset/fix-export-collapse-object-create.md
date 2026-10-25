---
"babel-plugin-transform-modules-ui5": patch
"babel-preset-transform-ui5": patch
---

fix: avoid crash when a default export uses `Object.assign(Object.create(null), …)` alongside named exports (#148)

`getPropertiesOfObjectAssignOrExtendHelper` no longer leaks `undefined` entries for call-expression arguments
(e.g. `Object.create(null)`), which previously caused `Cannot read properties of undefined (reading 'key')` during
export collapsing.
