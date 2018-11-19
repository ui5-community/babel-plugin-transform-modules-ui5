"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.convertClassToUI5Extend = convertClassToUI5Extend;
exports.getClassInfo = getClassInfo;

var _core = require("@babel/core");

var th = _interopRequireWildcard(require("./templates"));

var _path = _interopRequireDefault(require("path"));

var _objectAssignDefined = _interopRequireDefault(require("object-assign-defined"));

var ast = _interopRequireWildcard(require("./ast"));

var _jsdoc = require("./jsdoc");

var _decorators = require("./decorators");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = Object.defineProperty && Object.getOwnPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : {}; if (desc.get || desc.set) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } } newObj.default = obj; return newObj; } }

/**
 * Converts an ES6 class to a UI5 extend.
 * Any static methods or properties will be moved outside the class body.
 * The path will be updated with the new AST.
 */
function convertClassToUI5Extend(path, node, classInfo, extraStaticProps, opts) {
  // eslint-disable-line no-unused-vars
  if (!(_core.types.isClassDeclaration(node) || _core.types.isClassExpression(node))) {
    return node;
  }

  const staticMembers = [];
  const classNameIdentifier = node.id;
  const className = classNameIdentifier.name;
  const superClass = node.superClass; // Identifier

  const superClassName = node.superClass.name;
  const isController = className.includes("Controller") || !!classInfo.controller;
  const moveControllerPropsToOnInit = isController && !!opts.moveControllerPropsToOnInit;
  const moveStaticStaticPropsToExtend = isController && !!opts.addControllerStaticPropsToExtend;
  const extendProps = [];
  const boundProps = [];
  const CONSTRUCTOR = "constructor";
  const propsByName = {};
  let constructor;
  let constructorComments;
  const staticPropsToAdd = moveStaticStaticPropsToExtend ? Object.keys(extraStaticProps) : ["metadata", "renderer"];

  for (const propName of staticPropsToAdd) {
    if (extraStaticProps[propName]) {
      extendProps.push(_core.types.objectProperty(_core.types.identifier(propName), extraStaticProps[propName]));
    }
  }

  for (const member of node.body.body) {
    const memberName = member.key.name;

    const memberExpression = member.static && _core.types.memberExpression(classNameIdentifier, member.key);

    if (_core.types.isClassMethod(member)) {
      const func = _core.types.functionExpression(member.key, member.params, member.body, member.generator, member.async);

      if (member.static) {
        staticMembers.push(_core.types.expressionStatement(_core.types.assignmentExpression("=", memberExpression, func)));
      } else {
        propsByName[memberName] = func;
        func.generator = member.generator;
        func.async = member.async;

        if (member.kind === "get" || member.kind === "set") {
          extendProps.push(_core.types.objectMethod(member.kind, member.key, member.params, member.body, member.computed));
        } else {
          // method
          if (memberName === CONSTRUCTOR) {
            constructorComments = member.leadingComments;
            constructor = func;

            if (moveControllerPropsToOnInit) {
              continue; // don't push to props yet
            }
          }

          func.id = path.scope.generateUidIdentifier(func.id.name); // Give the function a unique name

          extendProps.push(_core.types.objectProperty(member.key, func));
        }
      }
    } else if (_core.types.isClassProperty(member)) {
      if (memberName === "metadata" || memberName === "renderer") {
        // Special handling for TypeScript limitation where metadata and renderer must be properties.
        extendProps.unshift(_core.types.objectProperty(member.key, member.value));
      } else if (member.static) {
        if (moveStaticStaticPropsToExtend) {
          extendProps.unshift(_core.types.objectProperty(member.key, member.value));
        } else {
          staticMembers.push(_core.types.expressionStatement(_core.types.assignmentExpression("=", memberExpression, member.value)));
        }
      } else {
        propsByName[memberName] = member.value;

        if (memberName === "constructor") {
          constructorComments = member.leadingComments;
          constructor = member.value;

          if (moveControllerPropsToOnInit) {
            continue; // don't push to props yet
          }
        }

        if (_core.types.isArrowFunctionExpression(member.value) || ast.isThisExpressionUsed(member.value)) {
          boundProps.push(member);
        } else {
          extendProps.push(_core.types.objectProperty(member.key, member.value));
        }
      }
    }
  } // Arrow function properties need to get moved to the constructor so that
  // they're bound properly to the class instance, to align with the spec.
  // For controllers, use onInit rather than constructor, since controller constructors don't work.
  // Also move the constructor's statements to the onInit.


  const bindToConstructor = !moveControllerPropsToOnInit;
  const bindToMethodName = moveControllerPropsToOnInit ? "onInit" : "constructor";

  const bindToId = _core.types.identifier(bindToMethodName);

  let bindMethod = moveControllerPropsToOnInit ? propsByName[bindToMethodName] : constructor; // avoid getting a prop named constructor as it may return {}'s

  const constructorJsdoc = (0, _jsdoc.getTags)(constructorComments);
  const keepConstructor = classInfo.keepConstructor || constructorJsdoc.keep;
  const needsBindingMethod = boundProps.length || moveControllerPropsToOnInit && constructor && !keepConstructor; // See if we need to inject the 'constructor' or 'onInit' method, depending which one we'll bind to.

  if (needsBindingMethod && !bindMethod) {
    const bindMethodDeclaration = bindToConstructor ? th.buildInheritingConstructor({
      SUPER: _core.types.identifier(superClassName)
    }) : th.buildInheritingFunction({
      NAME: bindToId,
      SUPER: _core.types.identifier(superClassName)
    });
    bindMethod = ast.convertFunctionDeclarationToExpression(bindMethodDeclaration);
    extendProps.unshift(_core.types.objectProperty(bindToId, bindMethod));
  }

  if (moveControllerPropsToOnInit && constructor) {
    if (keepConstructor) {
      extendProps.unshift(_core.types.objectProperty(_core.types.identifier(CONSTRUCTOR), constructor));
    } else {
      // Copy all except the super call from the constructor to the bindMethod (i.e. onInit)
      bindMethod.body.body.unshift(...constructor.body.body.filter(node => !ast.isSuperCallExpression(node.expression)));
    }
  }

  if (boundProps.length) {
    // We need to inject the bound props into the bind method (constructor or onInit),
    // but not until after the super call (if applicable)
    const mappedProps = boundProps.map(prop => {
      return th.buildThisAssignment({
        NAME: prop.key,
        VALUE: prop.value
      });
    });
    const superIndex = bindMethod.body.body.findIndex(node => ast.isSuperCallExpression(node.expression) || ast.isSuperPrototypeCallOf(node.expression, superClassName, bindToMethodName));

    if (superIndex === -1) {
      // If there's no super, just add the bound props at the start
      bindMethod.body.body.unshift(...mappedProps);
    } else {
      const upToSuper = bindMethod.body.body.slice(0, superIndex + 1);
      const afterSuper = bindMethod.body.body.slice(superIndex + 1);
      bindMethod.body.body = [...upToSuper, ...mappedProps, ...afterSuper];
    }
  }

  const extendAssign = th.buildExtendAssign({
    NAME: classNameIdentifier,
    SUPERNAME: superClass,
    FQN: _core.types.stringLiteral(getFullyQualifiedName(classInfo)),
    OBJECT: _core.types.objectExpression(extendProps)
  });
  return [extendAssign, ...staticMembers];
}
/**
 * Sees if a class prop references 'this'.
 * The logic is a bit limited, as it currently only looks at the
 * @param {*} classPropValue
 */
// function doesClassPropUseThis(classPropValue) {
//   if (t.isCallExpression(classProperty)) {
//   }
//   else if (t.isMemberExpression(classProperty)) {
//   }
//   else {
//     return false
//   }
// }


function getFullyQualifiedName(classInfo) {
  if (classInfo.alias) return classInfo.alias;
  if (classInfo.name) return classInfo.name;
  const separator = classInfo.namespace ? "." : "";
  return `${classInfo.namespace}${separator}${classInfo.localName}`;
}

function getClassInfo(path, node, parent, pluginOpts) {
  const defaults = {
    localName: node.id.name,
    superClassName: node.superClass && node.superClass.name,
    namespace: getFileBaseNamespace(path, pluginOpts) || ""
  };
  const decoratorInfo = (0, _decorators.getDecoratorClassInfo)(node);
  const jsDocInfo = (0, _jsdoc.getJsDocClassInfo)(node, parent);
  return (0, _objectAssignDefined.default)( // like Object.assign, but ignoring undefined values.
  defaults, decoratorInfo, jsDocInfo);
}
/**
 * Reads the namespace from the file path, but not the name
 */


function getFileBaseNamespace(path, pluginOpts) {
  const opts = path.hub.file.opts;

  const filename = _path.default.resolve(opts.filename);

  const sourceRoot = opts.sourceRoot || process.cwd();

  if (filename.startsWith(sourceRoot)) {
    const filenameRelative = _path.default.relative(sourceRoot, filename);

    const {
      dir
    } = _path.default.parse(filenameRelative);

    const namespaceParts = dir.split(_path.default.sep);

    if (pluginOpts.namespacePrefix) {
      namespaceParts.unshift(pluginOpts.namespacePrefix);
    }

    return namespaceParts.join(".");
  } else {
    return undefined;
  }
}