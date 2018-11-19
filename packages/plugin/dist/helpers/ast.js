"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.isObjectAssignOrExtendsExpression = isObjectAssignOrExtendsExpression;
exports.isObjectAssignExpression = isObjectAssignExpression;
exports.isExtendsHelperExpression = isExtendsHelperExpression;
exports.isImport = isImport;
exports.isIdentifierNamed = isIdentifierNamed;
exports.isCommentBlock = isCommentBlock;
exports.getIdName = getIdName;
exports.isSuperCallExpression = isSuperCallExpression;
exports.findPropertiesOfNode = findPropertiesOfNode;
exports.getInternalStaticThingsOfClass = getInternalStaticThingsOfClass;
exports.getOtherPropertiesOfIdentifier = getOtherPropertiesOfIdentifier;
exports.getPropertiesOfObjectAssignOrExtendHelper = getPropertiesOfObjectAssignOrExtendHelper;
exports.getPropNames = getPropNames;
exports.groupPropertiesByName = groupPropertiesByName;
exports.convertFunctionDeclarationToExpression = convertFunctionDeclarationToExpression;
exports.convertDeclarationToExpression = convertDeclarationToExpression;
exports.isSuperPrototypeCallOf = isSuperPrototypeCallOf;
exports.isCallExpressionCalling = isCallExpressionCalling;
exports.isThisExpressionUsed = isThisExpressionUsed;

var _core = require("@babel/core");

var _arrayFlatten = _interopRequireDefault(require("array-flatten"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function isObjectAssignOrExtendsExpression(node) {
  return isObjectAssignExpression(node) || isExtendsHelperExpression(node);
}

function isObjectAssignExpression(node) {
  if (!_core.types.isCallExpression(node)) return false;
  const callee = node && node.callee;
  return !!(callee.object && callee.property && callee.object.name === "Object" && callee.property.name === "assign");
}

function isExtendsHelperExpression(node) {
  if (!_core.types.isCallExpression(node)) return false;
  const callee = node && node.callee;
  return isIdentifierNamed(callee, "_extends");
} // t.isImport only exists if the dynamic import syntax plugin is used, so avoid using that to make it optional.


function isImport(node) {
  return node && node.type === "Import";
}

function isIdentifierNamed(node, name) {
  return _core.types.isIdentifier(node, {
    name: name
  });
} // This doesn't exist on babel-types


function isCommentBlock(node) {
  return node && node.type === "CommentBlock";
}

function getIdName(node) {
  return node.id && node.id.name;
}

function isSuperCallExpression(expression) {
  return _core.types.isCallExpression(expression) && expression.callee.type === "Super";
} // export function isSuperExpressionStatement(node) {
//   return isSuperCallExpression(node.expression)
// }


function findPropertiesOfNode(blockScopeNode, declaration) {
  if (_core.types.isFunctionDeclaration(declaration) || _core.types.isArrowFunctionExpression(declaration)) {
    return null;
  } else if (_core.types.isObjectExpression(declaration)) {
    return declaration.properties;
  } else if (_core.types.isClass(declaration)) {
    return [...getInternalStaticThingsOfClass(declaration), ...getOtherPropertiesOfIdentifier(blockScopeNode, declaration.id.name)];
  } else if (_core.types.isIdentifier(declaration)) {
    return getOtherPropertiesOfIdentifier(blockScopeNode, declaration.name);
  } else if (isObjectAssignOrExtendsExpression(declaration)) {
    return getPropertiesOfObjectAssignOrExtendHelper(declaration, blockScopeNode);
  }

  return null;
}

function getInternalStaticThingsOfClass(classNode) {
  return classNode.body.body.filter(item => item.static);
}
/**
 * Traverse the top-level of the scope (program or function body) looking for either:
 *  - ObjectExpression assignments to the object variable.
 *  - Property assignments directly to our object (but not to nested properties).
 *
 *  @return Array<{key, value}>
 */


function getOtherPropertiesOfIdentifier(blockScopeNode, idName) {
  return (0, _arrayFlatten.default)(blockScopeNode.body.map(node => {
    if (_core.types.isExpressionStatement(node)) {
      // ID = value | ID.key = value | ID.key.nested = value
      const {
        left,
        right
      } = node.expression;

      if (_core.types.isAssignmentExpression(node.expression)) {
        if (_core.types.isIdentifier(left) && left.name === idName) {
          // ID = value
          if (_core.types.isObjectExpression(right)) {
            // ID = {}
            return right.properties; // Array<ObjectProperty>
          }
        } else {
          const {
            object,
            property: key
          } = left;

          if (_core.types.isIdentifier(object) && object.name === idName) {
            // ID.key = value
            return {
              key,
              value: right
            }; // ObjectProperty-like (key, value)
          }
        }
      }
    } else if (_core.types.isVariableDeclaration(node)) {
      // console.log(require('util').inspect(node, { depth: 4 }));
      return node.declarations.filter(declaration => declaration.id.name === idName).map(declaration => declaration.init).filter(init => init).filter(init => _core.types.isObjectExpression(init) || isObjectAssignOrExtendsExpression(init)).map(init => _core.types.isObjectExpression(init) ? init.properties : getPropertiesOfObjectAssignOrExtendHelper(init, blockScopeNode));
    }
  }).filter(item => item));
}

function getPropertiesOfObjectAssignOrExtendHelper(node, blockScopeNode) {
  // Check all the args and recursively try to get props of identifiers (although they may be imported)
  return (0, _arrayFlatten.default)(node.arguments.map(arg => {
    if (_core.types.isObjectExpression(arg)) {
      return arg.properties;
    } else if (_core.types.isIdentifier(arg)) {
      // Recursive, although props will be empty if arg is an imported object
      return getOtherPropertiesOfIdentifier(blockScopeNode, arg.name);
    }
  }));
}

function getPropNames(props) {
  return props.map(prop => prop.key.name);
}

function groupPropertiesByName(properties) {
  return properties && properties.reduce((accumulator, property) => {
    accumulator[property.key.name] = property.value;
    return accumulator;
  }, {});
}

function convertFunctionDeclarationToExpression(declaration) {
  return _core.types.functionExpression(declaration.id, declaration.params, declaration.body, declaration.generator, declaration.async);
}

function convertDeclarationToExpression(declaration) {
  if (_core.types.isFunctionDeclaration(declaration)) {
    return convertFunctionDeclarationToExpression(declaration);
  } else {
    // console.log('-----', declaration.type)
    return declaration;
  }
}

function isSuperPrototypeCallOf(expression, superClassName, superMethodName) {
  return _core.types.isCallExpression(expression) && isCallExpressionCalling(expression, `${superClassName}.prototype.${superMethodName}.apply`);
}
/**
 * Helper to see if a call expression is calling a given method such as sap.ui.define().
 * The AST is structured in reverse (defined > ui > sap) so we reverse the method call to compare.
 *
 * @param {CallExpression} expression
 * @param {String} dotNotationString For example, sap.ui.define or Class.prototype.method.apply
 */


function isCallExpressionCalling(expression, dotNotationString) {
  if (!_core.types.isCallExpression(expression)) return false;
  const callee = expression.callee;
  const parts = dotNotationString.split(".");
  let node = callee;

  for (const nextNamePart of parts.reverse()) {
    if (!node) return false;
    const nodeName = node.name || node.property && node.property.name; // property won't be there for an anonymous function

    if (nodeName !== nextNamePart) return false;
    node = node.object;
  }

  return true;
}
/**
 * Recursively search through some parts of a node's for use of 'this'.
 * It checks the callee and the arguments but does not traverse into blocks.
 *
 * True scenarios include:
 *  - this            (ThisExpression)
 *  - this.a.b        (MemberExpression)
 *  - this.thing()    (CallExpression > callee > MemberExpression > ThisExpression)
 *  - method(this)    (CallExpression > arguments > ThisExpression)
 *  - method(this.a)  (CallExpression > arguments > MemberExpression > ThisExpression)
 *
 * @param {*} node
 */


function isThisExpressionUsed(node) {
  if (!node) {
    return false;
  }

  if (_core.types.isThisExpression(node)) {
    return true;
  } else if (_core.types.isCallExpression(node)) {
    return isThisExpressionUsed(node.callee) || node.arguments.some(isThisExpressionUsed);
  } else if (_core.types.isMemberExpression(node)) {
    // TODO: instead of recursion, we could traverse the member expressions until the deepest object, and see if that's ThisExpression
    return isThisExpressionUsed(node.object);
  } else {
    return false;
  }
}