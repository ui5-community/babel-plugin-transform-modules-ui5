import { types as t } from "@babel/core";
import { flatten } from "array-flatten";

export function isObjectAssignOrExtendsExpression(node) {
  return isObjectAssignExpression(node) || isExtendsHelperExpression(node);
}

export function isObjectAssignExpression(node) {
  if (!t.isCallExpression(node)) return false;
  const callee = node && node.callee;
  return !!(
    callee.object &&
    callee.property &&
    callee.object.name === "Object" &&
    callee.property.name === "assign"
  );
}

export function isExtendsHelperExpression(node) {
  if (!t.isCallExpression(node)) return false;
  const callee = node && node.callee;
  return isIdentifierNamed(callee, "_extends");
}

// t.isImport only exists if the dynamic import syntax plugin is used, so avoid using that to make it optional.
export function isImport(node) {
  return node && node.type === "Import";
}

export function isIdentifierNamed(node, name) {
  return t.isIdentifier(node, { name: name });
}

// This doesn't exist on babel-types
export function isCommentBlock(node) {
  return node && node.type === "CommentBlock";
}

export function getIdName(node) {
  return node.id && node.id.name;
}

export function isSuperCallExpression(expression) {
  return t.isCallExpression(expression) && expression.callee.type === "Super";
}

// export function isSuperExpressionStatement(node) {
//   return isSuperCallExpression(node.expression)
// }

export function findPropertiesOfNode(blockScopeNode, declaration) {
  if (
    t.isFunctionDeclaration(declaration) ||
    t.isArrowFunctionExpression(declaration)
  ) {
    return null;
  } else if (t.isObjectExpression(declaration)) {
    return declaration.properties;
  } else if (t.isClass(declaration)) {
    return [
      ...getInternalStaticThingsOfClass(declaration),
      ...getOtherPropertiesOfIdentifier(blockScopeNode, declaration.id.name),
    ];
  } else if (t.isIdentifier(declaration)) {
    return getOtherPropertiesOfIdentifier(blockScopeNode, declaration.name);
  } else if (isObjectAssignOrExtendsExpression(declaration)) {
    return getPropertiesOfObjectAssignOrExtendHelper(
      declaration,
      blockScopeNode
    );
  }
  return null;
}

export function getInternalStaticThingsOfClass(classNode) {
  return classNode.body.body.filter((item) => item.static);
}

/**
 * Traverse the top-level of the scope (program or function body) looking for either:
 *  - ObjectExpression assignments to the object variable.
 *  - Property assignments directly to our object (but not to nested properties).
 *
 *  @return Array<{key, value}>
 */
export function getOtherPropertiesOfIdentifier(blockScopeNode, idName) {
  return flatten(
    blockScopeNode.body
      .map((node) => {
        if (t.isExpressionStatement(node)) {
          // ID = value | ID.key = value | ID.key.nested = value
          const { left, right } = node.expression;
          if (t.isAssignmentExpression(node.expression)) {
            if (t.isIdentifier(left) && left.name === idName) {
              // ID = value
              if (t.isObjectExpression(right)) {
                // ID = {}
                return right.properties; // Array<ObjectProperty>
              }
            } else {
              const { object, property: key } = left;
              if (t.isIdentifier(object) && object.name === idName) {
                // ID.key = value
                return { key, value: right }; // ObjectProperty-like (key, value)
              }
            }
          }
        } else if (t.isVariableDeclaration(node)) {
          return node.declarations
            .filter((declaration) => declaration.id.name === idName)
            .map((declaration) => declaration.init)
            .filter((init) => init)
            .filter(
              (init) =>
                t.isObjectExpression(init) ||
                isObjectAssignOrExtendsExpression(init)
            )
            .map((init) =>
              t.isObjectExpression(init)
                ? init.properties
                : getPropertiesOfObjectAssignOrExtendHelper(
                    init,
                    blockScopeNode
                  )
            );
        }
      })
      .filter((item) => item)
  );
}

export function getPropertiesOfObjectAssignOrExtendHelper(
  node,
  blockScopeNode
) {
  // Check all the args and recursively try to get props of identifiers (although they may be imported)
  return flatten(
    node.arguments.map((arg) => {
      if (t.isObjectExpression(arg)) {
        return arg.properties;
      } else if (t.isIdentifier(arg)) {
        // Recursive, although props will be empty if arg is an imported object
        return getOtherPropertiesOfIdentifier(blockScopeNode, arg.name);
      }
    })
  );
}

export function getPropNames(props) {
  return props.map((prop) => prop.key.name);
}

export function groupPropertiesByName(properties) {
  return (
    properties &&
    properties.reduce((accumulator, property) => {
      accumulator[property.key.name] = property.value;
      return accumulator;
    }, {})
  );
}

export function convertFunctionDeclarationToExpression(declaration) {
  return t.functionExpression(
    declaration.id,
    declaration.params,
    declaration.body,
    declaration.generator,
    declaration.async
  );
}

export function convertDeclarationToExpression(declaration) {
  if (t.isFunctionDeclaration(declaration)) {
    return convertFunctionDeclarationToExpression(declaration);
  } else {
    return declaration;
  }
}

export function isSuperPrototypeCallOf(
  expression,
  superClassName,
  superMethodName
) {
  return (
    t.isCallExpression(expression) &&
    (isCallExpressionCalling(
      expression,
      `${superClassName}.prototype.${superMethodName}.apply`
    ) ||
      isCallExpressionCalling(
        expression,
        `${superClassName}.prototype.${superMethodName}.call`
      ))
  );
}

/**
 * Helper to see if a call expression is calling a given method such as sap.ui.define().
 * The AST is structured in reverse (defined > ui > sap) so we reverse the method call to compare.
 *
 * @param {CallExpression} expression
 * @param {String} dotNotationString For example, sap.ui.define or Class.prototype.method.apply
 */
export function isCallExpressionCalling(expression, dotNotationString) {
  if (!t.isCallExpression(expression)) return false;
  const callee = expression.callee;
  if (callee.type === "Identifier") {
    return callee.name === dotNotationString;
  } else {
    const parts = dotNotationString.split(".");
    let node = callee;
    for (const nextNamePart of parts.reverse()) {
      if (!node) return false;
      // property won't be there for an anonymous function
      const nodeName = node.name || (node.property && node.property.name);
      if (nodeName !== nextNamePart) return false;
      node = node.object;
    }
    return true;
  }
}

/**
 * Recursively search through some parts of a node's for use of 'this'.
 * It checks the callee and the arguments and traverses into arrow functions.
 *
 * True scenarios include:
 *  - this            (ThisExpression)
 *  - this.a.b        (MemberExpression)
 *  - this.thing()    (CallExpression > callee > MemberExpression > ThisExpression)
 *  - method(this)    (CallExpression > arguments > ThisExpression)
 *  - method(this.a)  (CallExpression > arguments > MemberExpression > ThisExpression)
 *  - () => this
 *  - () => this()
 *  - () => fn(this)
 *  - fn1(() => this)
 *  - fn1(() => this())
 *  - fn1(() => fn(this))
 *
 * Exits w/ false if a non-arrow function is encountered even if 'this' is used within.
 * - fn1(function() { this.fn2(); })
 *
 * @param {*} node
 */
export function isThisExpressionUsed(node) {
  if (!node) {
    return false;
  }
  if (Array.isArray(node)) {
    return node.some(isThisExpressionUsed);
  }
  if (t.isThisExpression(node)) {
    return true;
  }
  if (t.isFunctionExpression(node)) {
    return false;
  }
  const traversableProps = [
    "body",
    "callee",
    "arguments",
    "expression",
    "object",
    "property",
  ];
  return traversableProps.some(
    (prop) => node[prop] && isThisExpressionUsed(node[prop])
  );
}
