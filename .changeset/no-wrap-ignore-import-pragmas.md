---
"babel-plugin-transform-modules-ui5": minor
"babel-preset-transform-ui5": minor
---

Add two comment pragmas to opt out of module transformation:

- `/* @ui5-no-wrap */` (file level) leaves a module completely unwrapped —
  no `sap.ui.define`/`sap.ui.require` and no import/export rewriting — while
  still stripping TypeScript types. Intended for modules consumed as native
  ES modules, e.g. web workers.
- `/* @ui5-ignore-import */` (statement level) excludes a single static
  `import` or dynamic `import()` from being converted into a UI5 dependency.

Note: `@ui5-ignore-import` on a static import only yields valid output in an
unwrapped module (no exports, or together with `@ui5-no-wrap`); a leftover
ES `import` inside a `sap.ui.define` factory is not valid at runtime.
