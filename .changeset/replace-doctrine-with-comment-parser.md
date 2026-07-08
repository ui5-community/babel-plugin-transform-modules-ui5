---
"babel-plugin-transform-modules-ui5": patch
---

Fix JSDoc parsing failures (issue #150) by replacing the deprecated
`doctrine` parser with the actively maintained `comment-parser`.

`doctrine` has been unmaintained since 2018 and stops parsing a JSDoc
block as soon as it encounters a tag it does not recognise (e.g. an
optional `@param`, or a bare `@class`). As a result, plugin markers
like `@alias`, `@namespace`, `@nonUI5` or `@controller` that appeared
after such a tag were silently ignored and the class was left
untransformed.

`comment-parser` is purely structural and never bails — every tag in
the block is returned, regardless of order or content. The migration
is internal; no plugin option or fixture authoring change is required.

Three regression fixtures were added under
`packages/plugin/__test__/fixtures/classes/` covering the patterns
reported in the issue: a value tag (`@alias`) after an optional
`@param`, a bool flag (`@nonUI5`) after multiple optional params,
and a bare `@class` followed by `@namespace`/`@controller`.
