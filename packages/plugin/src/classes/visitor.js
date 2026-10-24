import { types as t } from "@babel/core";
import * as Path from "path";
import * as th from "../utils/templates";
import * as ast from "../utils/ast";
import * as classes from "./helpers/classes";
import {
  getImportDeclaration,
  saveSuperclassImportSource,
  isSuperclassTransitivelyKnown,
  recordAdditionalUI5ClassMatch,
  getEffectiveNamespacePrefix,
  isLocalChainConvertible,
} from "./helpers/imports";

/**
 * Built-in list of UI5 base-class module paths used by autoConvertKnownUI5Classes.
 * A class whose superclass is imported from one of these paths will be auto-converted
 * to .extend() syntax without requiring an explicit @alias/@namespace annotation.
 */
const KNOWN_UI5_BASE_CLASSES = [
  "sap/ui/core/mvc/Controller",
  "sap/ui/core/mvc/View",
  "sap/ui/core/mvc/XMLView",
  "sap/ui/core/mvc/JSView",
  "sap/ui/core/mvc/HTMLView",
  "sap/ui/core/mvc/JSONView",
  "sap/ui/core/UIComponent",
  "sap/ui/core/Component",
  "sap/ui/core/Control",
  "sap/ui/core/Element",
  "sap/ui/base/ManagedObject",
  "sap/ui/base/Object",
  "sap/ui/core/mvc/ControllerExtension",
];

/**
 * Subset of KNOWN_UI5_BASE_CLASSES that are UI5 controller types.
 * Used to auto-set classInfo.controller when no explicit @controller tag is present,
 * so that controller-specific options (moveControllerPropsToOnInit, etc.) activate
 * for classes that extend a controller base class directly.
 */
const KNOWN_UI5_CONTROLLER_CLASSES = [
  "sap/ui/core/mvc/Controller",
  "sap/ui/core/mvc/ControllerExtension",
];

const CONSTRUCTOR = "constructor";

export const ClassTransformVisitor = {
  ImportDeclaration(path) {
    this.importDeclarationPaths.push(path);
  },
  ImportDefaultSpecifier(path) {
    this.importNames.push(path.node.local.name);
  },
  ImportSpecifier(path) {
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
      const { node } = path;
      const className = node?.id?.name;

      if (!className || opts.neverConvertClass) {
        return;
      }
      if (!doesClassExtendFromImport(node, [...this.importNames])) {
        // If it doesn't extend from an import, treat it as plain ES2015 class.
        return;
      }

      // If the super class is one of the imports, we'll assume it's a UI5 managed class,
      // and therefore may need to be transformed to .extend() syntax.
      const classInfo = classes.getClassInfo(path, node, path.parent, opts);

      // filter found decorators (to be not handled by other plugins)
      node.decorators = node.decorators?.filter((d) => {
        const exp = d.expression;
        const name = exp.name || exp.callee?.name;
        return classInfo[name] === undefined;
      });

      const convertInfo = shouldConvertClass(file, node, opts, classInfo);
      if (convertInfo) {
        // Auto-set the controller flag when the filename suffix or superclass
        // import identifies this as a UI5 controller, so that controller-specific
        // options (moveControllerPropsToOnInit, etc.) activate even when the class
        // name does not contain "Controller" and no explicit @controller tag is set.
        if (!classInfo.controller) {
          const filename = file.opts.filename || "";
          if (
            opts.autoConvertUI5FileTypes !== false &&
            opts.autoConvertControllerClass !== false &&
            /[.]controller[.](js|ts)$/.test(filename)
          ) {
            classInfo.controller = true;
          } else if (convertInfo.isController) {
            // shouldConvertClass already walked the chain and found a controller ancestor.
            classInfo.controller = true;
          } else {
            // Direct superclass imported from a known controller base-class path.
            const directSuperClassName = node.superClass?.name;
            const importDecl = directSuperClassName
              ? getImportDeclaration(filename, directSuperClassName)
              : null;
            if (
              importDecl &&
              KNOWN_UI5_CONTROLLER_CLASSES.includes(importDecl.source.value)
            ) {
              classInfo.controller = true;
            }
          }
        }

        // Save super class name for converting super calls
        this.superClassName = classInfo.superClassName;
        // store the classinfo
        if (className) {
          this.classInfo = this.classInfo || {};
          this.classInfo[className] = classInfo;
        }
        // Record this file's superclass import source unconditionally so that
        // descendants in other files can use transitive detection even when this
        // class was converted via an explicit annotation (not autoConvertKnownUI5Classes).
        // Keyed by the class's own name so descendants can look up by the binding name
        // they used for the import (which equals the class name in the ancestor file).
        const superClassName = node.superClass?.name;
        if (superClassName) {
          const importDecl = getImportDeclaration(
            file.opts.filename,
            superClassName
          );
          if (importDecl) {
            saveSuperclassImportSource(
              file.opts.filename,
              className,
              superClassName,
              importDecl.source.value
            );
          }
        }
      }
    },
    exit(path, { opts = {} }) {
      const { node, parent, parentPath } = path;
      const className = node?.id?.name;

      // Only if classinfo has been found we process this file
      const classInfo = this.classInfo?.[className];
      if (!classInfo || !node.superClass) {
        return;
      }

      // Find the Block scoped parent (Program or Function body) and search for assigned properties within that (eg. MyClass.X = "X").
      const blockParent = path.findParent((path) => path.isBlock()).node;
      const staticProps = ast.groupPropertiesByName(
        ast.getOtherPropertiesOfIdentifier(blockParent, className)
      );

      // TODO: flag metadata and renderer for removal if applicable
      const ui5ExtendClass = classes.convertClassToUI5Extend(
        path,
        node,
        classInfo,
        staticProps,
        this.importDeclarationPaths,
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

      this.superClassName = null;
    },
  },
  /*!
   * Visits function calls.
   */
  "OptionalCallExpression|CallExpression"(path) {
    const { node } = path;
    const { callee } = node;
    // If the file already has sap.ui.define, get the names of variables it creates to use for the class logic.
    if (ast.isCallExpressionCalling(node, "sap.ui.define")) {
      this.importNames.push(
        ...getRequiredParamsOfSAPUIDefine(path, node).map((req) => req.name)
      );
      return;
    } else if (this.superClassName) {
      if (t.isSuper(callee)) {
        replaceConstructorSuperCall(path, node, this.superClassName);
      } else if (t.isSuper(callee.object)) {
        replaceObjectSuperCall(
          path,
          node,
          this.superClassName,
          path.isOptionalCallExpression()
        );
      } else if (isSuperApply(callee)) {
        replaceSuperApplyCall(
          path,
          node,
          this.superClassName,
          path.isOptionalCallExpression()
        );
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
  const callbackNode = defineArgs.find((argNode) => t.isFunction(argNode));
  return callbackNode?.params || []; // Identifier
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
function replaceObjectSuperCall(path, node, superClassName, optional = false) {
  replaceSuperNamedCall(
    path,
    node,
    superClassName,
    node.callee.property.name,
    optional
  );
}

/**
 * Replace super.method.apply() call
 */
function replaceSuperApplyCall(path, node, superClassName, optional = false) {
  const methodName = node.callee.object.property.name;
  const op = optional ? "?." : ".";
  path.replaceWith(
    t.callExpression(
      t.identifier(`${superClassName}.prototype.${methodName}${op}apply`),
      node.arguments
    )
  );
}

function replaceSuperNamedCall(
  path,
  node,
  superClassName,
  methodName,
  optional = false
) {
  // .call() is better for simple args (or not args) but doesn't work right for spread args
  // if it gets further transpiled by babel spread args transform (will be .call.apply(...).
  const thisEx = t.thisExpression();
  const hasSpread = node.arguments.some(t.isSpreadElement);
  const caller = hasSpread ? "apply" : "call";
  const callArgs = hasSpread
    ? [thisEx, t.arrayExpression(node.arguments)]
    : [thisEx, ...node.arguments];
  const op = optional ? "?." : ".";
  path.replaceWith(
    t.callExpression(
      t.identifier(`${superClassName}.prototype.${methodName}${op}${caller}`),
      callArgs
    )
  );
}

function doesClassExtendFromImport(node, imports) {
  const superClass = node.superClass;
  return superClass && imports.some((imported) => imported === superClass.name);
}

// Sentinel objects returned by shouldConvertClass.
// Using distinct objects (not `true`) lets callers read `isController` without a second walk.
const CONVERT = { isController: false };
const CONVERT_CONTROLLER = { isController: true };

function shouldConvertClass(file, node, opts, classInfo) {
  if (classInfo.nonUI5) {
    return null;
  }
  if (opts.autoConvertAllExtendClasses == true) {
    return CONVERT;
  }
  if (
    classInfo.name ||
    classInfo.alias ||
    classInfo.controller ||
    classInfo.namespace
  ) {
    return CONVERT;
  }

  // Filename-suffix opt-outs are authoritative overrides — honor them regardless of
  // whether autoConvertUI5FileTypes is on or off. A user who explicitly disables
  // controller or view conversion must not have it silently re-enabled by the
  // known-class branch or any other detection path.
  {
    const filename = file.opts.filename || "";
    if (
      /[.]controller[.](js|ts)$/.test(filename) &&
      opts.autoConvertControllerClass === false
    ) {
      return null;
    }
    if (
      /[.]view[.](js|ts|jsx|tsx)$/.test(filename) &&
      opts.autoConvertViewClass === false
    ) {
      return null;
    }
  }

  // Preserve legacy .controller.(js|ts) behaviour exactly: controllers have always
  // been auto-converted without requiring a resolvable namespace, so this runs before
  // the namespace guard below. Views are a new feature and remain subject to the guard.
  if (
    opts.autoConvertUI5FileTypes !== false &&
    opts.autoConvertControllerClass !== false &&
    /[.]controller[.](js|ts)$/.test(file.opts.filename || "")
  ) {
    return CONVERT_CONTROLLER;
  }

  // For all auto-conversion paths below, require a non-empty namespace so the
  // generated FQN is not a bare class name. fileNamespace is derived from the
  // file path relative to sourceRoot (+ namespacePrefix if set).
  if (!classInfo.fileNamespace) {
    return null;
  }

  // Don't auto-convert when unknown (non-UI5) decorators remain on the class —
  // those decorators may transform the class in ways incompatible with .extend().
  // Explicit @alias/@namespace annotations (handled above) still take precedence.
  if (node.decorators?.length) {
    const names = node.decorators
      .map((d) => "@" + (d.expression.name || d.expression.callee?.name || "?"))
      .join(", ");
    console.warn(
      `[babel-plugin-ui5] Skipping auto-conversion of class "${node.id?.name}" in "${file.opts.filename}" — ` +
        `non-UI5 decorator(s) present: ${names}. Add @alias or @namespace to convert explicitly.`
    );
    return null;
  }

  // Convert classes whose superclass is imported from a known UI5 base-class module.
  // autoConvertKnownUI5Classes defaults to true; opt out by setting it to false.
  // additionalUI5Classes entries are always checked regardless of autoConvertKnownUI5Classes —
  // the two are independent: one controls the built-in list, the other adds custom paths.
  const useBuiltInList = opts.autoConvertKnownUI5Classes !== false;
  const hasAdditionalClasses = !!opts.additionalUI5Classes?.length;
  if (useBuiltInList || hasAdditionalClasses) {
    const knownPaths = [
      ...(useBuiltInList ? KNOWN_UI5_BASE_CLASSES : []),
      ...(opts.additionalUI5Classes || []),
    ];
    if (knownPaths.length) {
      const superClassName = node.superClass?.name;
      const className = node.id?.name;
      const filename = file.opts.filename;
      const importDecl = getImportDeclaration(filename, superClassName);
      if (importDecl) {
        const importSource = importDecl.source.value;
        // Record keyed by the class's own name so descendants can look up by the binding
        // name they used in their import (which equals the class name in the ancestor file).
        // Also records the superclass binding name so the transitive chain can be followed.
        saveSuperclassImportSource(
          filename,
          className,
          superClassName,
          importSource
        );
        // Direct hit — immediate superclass is a known UI5 base class
        if (knownPaths.includes(importSource)) {
          if (opts.additionalUI5Classes?.includes(importSource)) {
            recordAdditionalUI5ClassMatch(importSource);
          }
          return KNOWN_UI5_CONTROLLER_CLASSES.includes(importSource)
            ? CONVERT_CONTROLLER
            : CONVERT;
        }
        // Transitive hit — walk the superclass chain through already-processed local files.
        // isSuperclassTransitivelyKnown returns the matched importSource string (or null).
        const sourceRoot = file.opts.sourceRoot
          ? Path.resolve(process.cwd(), file.opts.sourceRoot)
          : process.cwd();
        // Use the effective namespace prefix for the current file (respects sourceFolders).
        // ?? (not ||) so that an explicit "" mapping in sourceFolders is respected —
        // || would treat "" as falsy and fall through to namespacePrefix.
        const effectivePrefix =
          getEffectiveNamespacePrefix(filename, sourceRoot, opts) ??
          opts.namespacePrefix ??
          null;
        const transitiveMatch = isSuperclassTransitivelyKnown(
          filename,
          superClassName,
          knownPaths,
          sourceRoot,
          {
            namespacePrefix: effectivePrefix,
            sourceFolders: opts.sourceFolders ?? null,
            dependencies: opts.dependencies ?? null,
          }
        );
        if (transitiveMatch) {
          // N2: walk every intermediate local ancestor in the chain and verify that each
          // one has a resolvable namespace (or is a legacy .controller.(js|ts) file that
          // converts without a namespace). An ancestor with an empty namespace that is NOT
          // a controller file remains a native ES class at runtime, so calling .extend()
          // on it would throw.
          //
          // isLocalChainConvertible checks the *full* chain, not only the direct ancestor:
          // a chain MyCtrl→LocalA(has NS)→LocalMid(empty NS)→SAP Controller is rejected
          // because LocalMid would not be converted to .extend().
          if (
            !isLocalChainConvertible(
              importSource,
              filename,
              sourceRoot,
              effectivePrefix,
              knownPaths,
              opts
            )
          ) {
            return null;
          }
          // F4: mark only the path that was actually matched, not every additionalUI5Classes
          // entry — to avoid suppressing valid "never matched" warnings for typo paths.
          if (opts.additionalUI5Classes?.includes(transitiveMatch)) {
            recordAdditionalUI5ClassMatch(transitiveMatch);
          }
          return KNOWN_UI5_CONTROLLER_CLASSES.includes(transitiveMatch)
            ? CONVERT_CONTROLLER
            : CONVERT;
        }
      }
    }
  }
  // Convert classes in .view.* files based on filename suffix (requires namespace above).
  // .controller.* is already handled before the namespace guard to preserve legacy behaviour.
  if (
    opts.autoConvertUI5FileTypes !== false &&
    opts.autoConvertViewClass !== false &&
    /[.]view[.](js|ts|jsx|tsx)$/.test(file.opts.filename || "")
  ) {
    return CONVERT;
  }
  return null;
}
