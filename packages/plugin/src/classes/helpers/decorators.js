const classInfoValueTags = [
  "alias",
  "name",
  "namespace",
  "metadata",
  "renderer",
];

const classInfoBoolTags = ["nonUI5"];

export function getDecoratorClassInfo(node) {
  const decorators = node.decorators;
  if (!decorators || !decorators.length) {
    return {};
  }
  const decoratorsByName = groupByName(decorators);
  const info = {};
  for (const tagName of classInfoValueTags) {
    const value = getDecoratorValue(decoratorsByName[tagName.toLowerCase()]);
    if (value) {
      info[tagName] = value;
    }
  }
  for (const tagName of classInfoBoolTags) {
    const value = !!decoratorsByName[tagName.toLowerCase()];
    if (value) {
      info[tagName] = value;
    }
  }
  return info;
}

function groupByName(decorators) {
  return decorators.reduce((accumulator, decorator) => {
    const expression = decorator.expression;
    const name =
      expression.name || (expression.callee && expression.callee.name);
    // Skip decorators with no resolvable name — e.g. member-expression decorators
    // like `@foo.bar` / `@foo.bar()` (callee is a MemberExpression, so .name is
    // undefined). These are never one of the recognised UI5 tags, and indexing with
    // an undefined name would throw on .toLowerCase().
    if (!name) {
      return accumulator;
    }
    accumulator[name.toLowerCase()] = decorator;
    return accumulator;
  }, {});
}

function getDecoratorValue(decorator) {
  // A recognised value tag may be used without a call (e.g. `@alias` instead of
  // `@alias("x")`). In that case decorator.expression is an Identifier with no
  // `.arguments`, so guard before indexing to avoid a crash.
  const args =
    (decorator && decorator.expression && decorator.expression.arguments) || [];
  return (args[0] || {}).value;
}
