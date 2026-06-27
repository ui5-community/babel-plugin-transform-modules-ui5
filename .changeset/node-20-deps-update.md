---
"babel-plugin-transform-modules-ui5": minor
"babel-preset-transform-ui5": minor
---

Raise minimum Node.js version to 20.19, refresh dev dependencies, and migrate ESLint to v9 flat config.

- `engines.node` is now `>=20.19.0` for both packages.
- ESLint upgraded to 9.x with new `eslint.config.js` (legacy `.eslintrc.js` and `.eslintignore` removed).
- `eslint-plugin-node` (unmaintained) replaced by `eslint-plugin-n@17`.
- Removed obsolete dev dependencies: `babel-eslint` (superseded by `@babel/eslint-parser`), `eslint-config-standard`, `eslint-plugin-standard`.
- Bumped `eslint-config-prettier` to 10.x, `eslint-plugin-prettier` to 5.5.x, `eslint-plugin-promise` to 7.x, `prettier` to 3.8.x, `jest`/`babel-jest` to 30.4.x, `core-js` to 3.49.x.
- CI matrix updated from Node 18/20/22/24 to 20/22/24.

No changes to plugin runtime behavior or production dependencies.
