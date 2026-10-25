---
"babel-plugin-transform-modules-ui5": patch
"babel-preset-transform-ui5": patch
---

fix: handle string-literal import names and object property keys; escape regex metacharacters in noImportInteropPrefixes

Picks up the still-relevant fixes from PR #163 (thanks @mauriciolauffer):

- Named imports using string-literal specifiers (`import { "some-export" as local } from "mod"`) now produce correct destructure output instead of `undefined`.
- `noImportInteropPrefixes` entries are now regex-escaped before being embedded in the regexp pattern, preventing metacharacters from acting as wildcards.
- `getPropNames` and `groupPropertiesByName` in `utils/ast.js` now handle `StringLiteral` property keys in addition to `Identifier` keys.
