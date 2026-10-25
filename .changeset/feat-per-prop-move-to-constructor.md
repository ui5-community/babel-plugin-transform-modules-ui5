---
"babel-plugin-transform-modules-ui5": minor
"babel-preset-transform-ui5": minor
---

feat: add `@movePropsToConstructor` per-property annotation to opt out of `moveControllerPropsToOnInit` (#116)

When `moveControllerPropsToOnInit` is enabled, individual class properties can be kept in the
constructor by annotating them with `@movePropsToConstructor` (JSDoc block comment or decorator):

```ts
export default class MyController extends Controller {
  /** Normal prop — moves to onInit as usual */
  prop = 1;

  /**
   * @movePropsToConstructor
   */
  formatter = { formatValue: (v: string) => v }; // stays in constructor

  handler = () => true; // moves to onInit as usual
}
```
