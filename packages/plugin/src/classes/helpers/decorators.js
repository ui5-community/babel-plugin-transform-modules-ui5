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
