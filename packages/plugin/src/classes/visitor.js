import { types as t } from "@babel/core";
import * as th from "../utils/templates";
import * as ast from "../utils/ast";
import * as classes from "./helpers/classes";

const CONSTRUCTOR = "constructor";

export const ClassTransformVisitor = {
  ImportDefaultSpecifier(path) {
    this.importNames.push(path.node.local.name);
  },
  /**
   * ClassDeclaration visitor.
   * Use both enter() and exit() to track when the visitor is inside a UI5 class,
   * in order to convert the super calls.
   * No changes for non-UI5 classes.
   */
  Class: {
    enter(path, { file, opts = {} }) {
      const { node, parent, parentPath } = path;

      if (opts.neverConvertClass) {
        return;
      }
      if (!doesClassExtendFromImport(node, [...this.importNames])) {
        // If it doesn't extend from an import, treat it as plain ES2015 class.
        return;
      }

      // If the super class is one of the imports, we'll assume it's a UI5 managed class,
      // and therefore may need to be transformed to .extend() syntax.
      const classInfo = classes.getClassInfo(path, node, path.parent, opts);

      if (!shouldConvertClass(file, node, opts, classInfo)) {
        return;
      }

      if (classInfo.metadata) {
        const identifier = t.identifier("MetadataObject");
        const importDefaultSpecifier = t.importDefaultSpecifier(identifier);
        const importDeclaration = t.importDeclaration(
          [importDefaultSpecifier],
          t.stringLiteral(
            classInfo.metadata.replace(new RegExp("\\.", "g"), "/")
          )
        );
        path
          .findParent(path => path.isBlock())
          .unshiftContainer("body", importDeclaration);
      }

      // Save super class name for converting super calls
      this.superClassName = classInfo.superClassName;

      // Find the Block scoped parent (Program or Function body) and search for assigned properties within that (eg. MyClass.X = "X").
      const { name: className } = node.id;
      const blockParent = path.findParent(path => path.isBlock()).node;
      const staticProps = ast.groupPropertiesByName(
        ast.getOtherPropertiesOfIdentifier(blockParent, className)
      );
      // TODO: flag metadata and renderer for removal if applicable
      const ui5ExtendClass = classes.convertClassToUI5Extend(
        path,
        node,
        classInfo,
        staticProps,
        opts
      );

      if (path.isClassDeclaration()) {
        if (t.isExportDefaultDeclaration(parent)) {
          path.parentPath.replaceWithMultiple([
            ...ui5ExtendClass,
            th.buildExportDefault({
              VALUE: node.id,
            }),
          ]);
        } else {
          // e.g. class X {}
          path.replaceWithMultiple(ui5ExtendClass);
        }
      } else if (path.isClassExpression()) {
        //e.g. return class X {}
        if (t.isReturnStatement(parent)) {
          // Add the return statement back before calling replace
          ui5ExtendClass.push(
            th.buildReturn({
              ID: t.identifier(classInfo.localName),
            })
          );
        }
        parentPath.replaceWithMultiple(ui5ExtendClass);
      }
    },
    exit() {
      this.superClassName = null;
    },
  },
  /*!
   * Visits function calls.
   */
  CallExpression(path) {
    const { node } = path;
    const { callee } = node;
    // If the file already has sap.ui.define, get the names of variables it creates to use for the class logic.
    if (ast.isCallExpressionCalling(node, "sap.ui.define")) {
      this.importNames.push(
        ...getRequiredParamsOfSAPUIDefine(path, node).map(req => req.name)
      );
      return;
    } else if (this.superClassName) {
      if (t.isSuper(callee)) {
        replaceConstructorSuperCall(path, node, this.superClassName);
      } else if (t.isSuper(callee.object)) {
        replaceObjectSuperCall(path, node, this.superClassName);
      } else if (isSuperApply(callee)) {
        replaceSuperApplyCall(path, node, this.superClassName);
      }
    }
  },
  /**
   * Convert object method constructor() to constructor: function constructor(),
   * since a UI5 class is not a real class.
   */
  ObjectMethod(path) {
    const { node } = path;
    if (node.key.name === CONSTRUCTOR) {
      // The keyword 'constructor' should not be used as a shorthand
      // method name in an object. It might(?) work on some objects,
      // but it doesn't work with X.extend(...) inheritance.
      path.replaceWith(
        t.objectProperty(
          t.identifier(CONSTRUCTOR),
          t.functionExpression(
            t.identifier(CONSTRUCTOR),
            node.params,
            node.body
          )
        )
      );
    }
  },
};

function isSuperApply(callee) {
  return (
    t.isIdentifier(callee.property, { name: "apply" }) &&
    t.isSuper(callee.object.object)
  );
}

function getRequiredParamsOfSAPUIDefine(path, node) {
  const defineArgs = node.arguments;
  const callbackNode = defineArgs.find(argNode => t.isFunction(argNode));
  return callbackNode.params; // Identifier
}

/**
 * Replace super() call
 */
function replaceConstructorSuperCall(path, node, superClassName) {
  replaceSuperNamedCall(path, node, superClassName, CONSTRUCTOR);
}

/**
 * Replace super.method() call
 */
function replaceObjectSuperCall(path, node, superClassName) {
  replaceSuperNamedCall(path, node, superClassName, node.callee.property.name);
}

/**
 * Replace super.method.apply() call
 */
function replaceSuperApplyCall(path, node, superClassName) {
  const methodName = node.callee.object.property.name;
  path.replaceWith(
    t.callExpression(
      t.identifier(`${superClassName}.prototype.${methodName}.apply`),
      node.arguments
    )
  );
}

function replaceSuperNamedCall(path, node, superClassName, methodName) {
  // .call() is better for simple args (or not args) but doesn't work right for spread args
  // if it gets further transpiled by babel spread args transform (will be .call.apply(...).
  const thisEx = t.thisExpression();
  const hasSpread = node.arguments.some(t.isSpreadElement);
  const caller = hasSpread ? "apply" : "call";
  const callArgs = hasSpread
    ? [thisEx, t.arrayExpression(node.arguments)]
    : [thisEx, ...node.arguments];
  path.replaceWith(
    t.callExpression(
      t.identifier(`${superClassName}.prototype.${methodName}.${caller}`),
      callArgs
    )
  );
}

function doesClassExtendFromImport(node, imports) {
  const superClass = node.superClass;
  return superClass && imports.some(imported => imported === superClass.name);
}

function shouldConvertClass(file, node, opts, classInfo) {
  if (classInfo.nonUI5) {
    return false;
  }
  if (opts.autoConvertAllExtendClasses == true) {
    return true;
  }
  if (
    classInfo.name ||
    classInfo.alias ||
    classInfo.controller ||
    classInfo.namespace
  ) {
    return true;
  }
  if (
    /.*[.]controller[.]js$/.test(file.opts.filename) &&
    opts.autoConvertControllerClass !== false
  ) {
    return true;
  }
  return false;
}
