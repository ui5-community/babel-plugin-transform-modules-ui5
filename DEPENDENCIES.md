# Dependencies

This document captures what we depend on, **why**, and the upgrade
constraints we hit when trying to take newer majors. It is updated
each time a dependency wave lands. See also the
[Node.js support policy](CONTRIBUTING.md#nodejs-support-policy) which
governs how we move the Node.js floor (and therefore which dependency
majors we can adopt).

## Runtime dependencies (plugin)

| Package | Why we use it | Notes |
| --- | --- | --- |
| `comment-parser` | Parses leading JSDoc blocks on classes to extract plugin markers (`@alias`, `@namespace`, `@nonUI5`, `@controller`, `@keepConstructor`, `@global`). | Replaced `doctrine` in 7.8.x (see [issue #150](https://github.com/ui5-community/babel-plugin-transform-modules-ui5/issues/150)). `doctrine` was unmaintained since 2018 and silently bailed on unknown tags. `comment-parser` is purely structural and never drops tags. |

The plugin also has a `peerDependencies: { "@babel/core": "*" }` —
consumers bring their own Babel.

## Deliberately held-back majors

These are dependencies whose latest major would force us to drop a
supported Node.js line. We are pinned to the last release compatible
with `engines.node: ">=20.19.0"` until we decide to raise the floor:

| Package | Current | Latest | Why held back |
| --- | --- | --- | --- |
| `@commitlint/cli`, `@commitlint/config-conventional` | 20.x | 21.x | v21 requires Node `>=22.12.0`. |
| `@babel/core` (and the rest of the `@babel/*` family) | 7.29.x | 8.0.x | Babel 8 requires Node `^22.18.0 \|\| >=24.11.0`. Babel 8 is also a meaningful API break for plugin authors; it deserves its own dedicated PR + plugin major even after we move the Node floor. |
| `eslint`, `@eslint/js` | 9.39.x | 10.x | ESLint 10 calls `ScopeManager#addGlobals()` which `@babel/eslint-parser` 7 does not implement. Lifting requires `@babel/eslint-parser` 8, which requires Babel 8, which requires Node 22+. Linked to the Babel hold. |
| `eslint-plugin-n` | 17.24.x | 18.x | v18 itself is Node-20-compatible, but only useful in combination with ESLint 10 — bumping it alone gives nothing today. Kept in step with the ESLint major. |

## Upgrade-process learnings

Notes from past dependency waves that future contributors can use to
avoid the same dead-ends.

### Wave 1 — Node 20.19 baseline + ESLint 9 (2026)

- ESLint 8 was deeply tangled with the legacy `.eslintrc` config and the
  unmaintained `eslint-plugin-node`. Migrating to ESLint 9 flat config
  (single root [`eslint.config.js`](eslint.config.js)) was a clean cut
  and is now the only config style we ship.
- `eslint-plugin-node` is dead; the actively-maintained fork is
  `eslint-plugin-n`.
- `babel-eslint` was retired by Babel itself years ago — we now use
  `@babel/eslint-parser`.

### Wave 2 — Drop tiny single-purpose runtime deps

- `array-flatten`, `ignore-case`, and `object-assign-defined` were all
  legacy single-function packages. Each was replaced by a one-line
  built-in (`Array.prototype.flat(Infinity)`, `String.prototype.toLowerCase`,
  an 8-line `assignDefined` helper). Lesson: do this check before every
  major upgrade — runtime deps that exist solely to polyfill a Node ≥ 12
  built-in are pure liability.

### Wave 3 — Replace `doctrine` with `comment-parser` (issue #150)

- The `doctrine` parser used to be eslint's JSDoc parser. eslint
  archived it in 2018 in favour of `@es-joy/jsdoccomment`.
- The user-visible symptom in issue #150 was that classes whose JSDoc
  block contained an optional `@param` or a bare `@class` lost the
  `@alias` / `@namespace` / `@nonUI5` markers that followed and were
  therefore not transpiled.
- We considered `@es-joy/jsdoccomment` but chose plain `comment-parser`
  (which `@es-joy/jsdoccomment` itself wraps): we never used doctrine's
  type-parsing feature, so the smaller surface is preferable.

### Wave 4 — npm-outdated review against the Node 20 floor

- **ESLint 10 cannot ship while we are on Babel 7** — its scope-manager
  contract (`ScopeManager#addGlobals()`) is not implemented by the
  Babel 7 line of `@babel/eslint-parser`. Picking up ESLint 10
  therefore transitively requires Babel 8, which requires Node 22+.
  This is the largest hidden coupling we discovered.
- `@commitlint/cli` 21 explicitly bumped its `engines.node` to
  `>=22.12.0`. The functional difference vs 20.x is small enough that
  holding back is the right call until we move Node anyway.
- `globals` and `prettier` minors have so far been completely
  transparent — they can be picked up any time.

## When you're considering a major bump

1. Check the package's published `engines.node` against our current
   floor (`npm view <pkg>@<version> engines`).
2. Check its peer dependencies — does it pull in a major of something
   else we are deliberately holding back? (ESLint 10 ↔ Babel 8 is the
   canonical trap.)
3. Read the upstream changelog for changes to the contract we actually
   rely on (e.g. parser/scope-manager API for ESLint, comment-block
   shape for our JSDoc reader, Babel visitor signatures).
4. If it's a tooling dep (lint, format, tests) the blast radius is the
   contributor experience. If it's a runtime dep or a Babel peer, it
   affects every consumer of this plugin and needs a major version
   bump of the plugin itself.
