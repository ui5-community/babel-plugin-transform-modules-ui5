// Tags that provide a value for the class info via decorators.
// The naming tags follow the same conventions as their JSDoc equivalents:
//   @alias     — recommended for named UI5 extend-classes; sets the fully-qualified
//               class name passed to .extend().
//   @name      — use for anonymous (unnamed) class expressions where @alias cannot
//               be used.
//   @namespace — sets the namespace prefix for converted extend-classes; the ES class
//               name is appended automatically to form the full FQN.
// The following two are parsed but their values are not used by the class transformer;
// metadata and renderer are handled via static class properties instead:
//   @metadata, @renderer
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
    accumulator[name.toLowerCase()] = decorator;
    return accumulator;
  }, {});
}

function getDecoratorValue(decorator) {
  return ((decorator && decorator.expression.arguments[0]) || {}).value;
}
