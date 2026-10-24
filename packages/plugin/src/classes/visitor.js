import { types as t } from "@babel/core";
import * as Path from "path";
import * as th from "../utils/templates";
import * as ast from "../utils/ast";
import * as classes from "./helpers/classes";
import {
  getImportDeclaration,
  saveSuperclassImportSource,
  isSuperclassTransitivelyKnown,
  resolveImportSourceToFilename,
  recordAdditionalUI5ClassMatch,
  getEffectiveNamespacePrefix,
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

      if (shouldConvertClass(file, node, opts, classInfo)) {
        // Auto-set the controller flag when the filename suffix or superclass
        // import identifies this as a UI5 controller, so that controller-specific
        // options (moveControllerPropsToOnInit, etc.) activate even when the class
        // name does not contain "Controller" and no explicit @controller tag is set.
        if (!classInfo.controller) {
          const filename = file.opts.filename || "";
          if (
            opts.autoConvertUI5FileTypes !== false &&
            opts.autoConvertControllerClass !== false &&
            /.*[.]controller[.](js|ts)$/.test(filename)
          ) {
            classInfo.controller = true;
          } else {
            // Direct superclass imported from a known controller base-class path.
            const superClassName = node.superClass?.name;
            const importDecl = superClassName
              ? getImportDeclaration(filename, superClassName)
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

  // Filename-suffix opt-outs are authoritative overrides — honor them regardless of
  // whether autoConvertUI5FileTypes is on or off. A user who explicitly disables
  // controller or view conversion must not have it silently re-enabled by the
  // known-class branch or any other detection path.
  {
    const filename = file.opts.filename || "";
    if (
      /.*[.]controller[.](js|ts)$/.test(filename) &&
      opts.autoConvertControllerClass === false
    ) {
      return false;
    }
    if (
      /.*[.]view[.](js|ts|jsx|tsx)$/.test(filename) &&
      opts.autoConvertViewClass === false
    ) {
      return false;
    }
  }

  // Preserve legacy .controller.(js|ts) behaviour exactly: controllers have always
  // been auto-converted without requiring a resolvable namespace, so this runs before
  // the namespace guard below. Views are a new feature and remain subject to the guard.
  if (
    opts.autoConvertUI5FileTypes !== false &&
    opts.autoConvertControllerClass !== false &&
    /.*[.]controller[.](js|ts)$/.test(file.opts.filename || "")
  ) {
    return true;
  }

  // For all auto-conversion paths below, require a non-empty namespace so the
  // generated FQN is not a bare class name. fileNamespace is derived from the
  // file path relative to sourceRoot (+ namespacePrefix if set).
  if (!classInfo.fileNamespace) {
    return false;
  }

  // Don't auto-convert when unknown (non-UI5) decorators remain on the class —
  // those decorators may transform the class in ways incompatible with .extend().
  // Explicit @alias/@namespace annotations (handled above) still take precedence.
  if (node.decorators?.length) {
    return false;
  }

  // Convert classes whose superclass is imported from a known UI5 base-class module.
  // autoConvertKnownUI5Classes defaults to true; opt out by setting it to false.
  // additionalUI5Classes: extra module paths added on top of the built-in list.
  if (
    opts.autoConvertKnownUI5Classes !== false ||
    opts.additionalUI5Classes?.length
  ) {
    const knownPaths = [
      ...(opts.autoConvertKnownUI5Classes !== false
        ? KNOWN_UI5_BASE_CLASSES
        : []),
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
          return true;
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
          effectivePrefix
        );
        if (transitiveMatch) {
          // N2: verify the direct ancestor (the class this file imports) would itself be
          // convertible — specifically that it has either a non-empty namespace or is a
          // legacy controller file (which converts even at the root without a namespace,
          // matching the shouldConvertClass exemption). An ancestor with an empty namespace
          // that is NOT a controller file remains a native ES class, so calling .extend()
          // on it at runtime would throw.
          //
          // Reuse importDecl/importSource from above: importDeclarations[filename] is not
          // mutated between there and here, so a re-fetch would return the same declaration.
          const ancestorFile = resolveImportSourceToFilename(
            importSource,
            filename,
            sourceRoot,
            effectivePrefix
          );
          if (ancestorFile) {
            // Containment check via Path.relative: the ancestor is inside sourceRoot
            // only when the relative path doesn't escape upward ("..") and isn't absolute
            // (absolute happens on Windows across drives). A plain startsWith(sourceRoot)
            // would wrongly match a sibling dir like "<sourceRoot>-legacy/".
            const ancestorRel = Path.relative(sourceRoot, ancestorFile);
            const ancestorInsideSourceRoot =
              ancestorRel === "" ||
              (!ancestorRel.startsWith("..") && !Path.isAbsolute(ancestorRel));
            // Compute the ancestor's own effective prefix (it may live in a different sourceFolders entry).
            // ?? (not ||) so that an explicit "" mapping in sourceFolders is respected —
            // || would treat "" as falsy and fall through to namespacePrefix.
            const ancestorEffectivePrefix = ancestorInsideSourceRoot
              ? (getEffectiveNamespacePrefix(ancestorFile, sourceRoot, opts) ??
                opts.namespacePrefix ??
                null)
              : null;
            const ancestorDirParts = ancestorInsideSourceRoot
              ? Path.parse(ancestorRel).dir.split(Path.sep).filter(Boolean)
              : [];
            // When sourceFolders is active, the leading folder segment is the source-folder key
            // and must be stripped (getEffectiveNamespacePrefix already incorporated its prefix).
            const sourceFolders = opts.sourceFolders;
            const skipLeadingFolder =
              sourceFolders &&
              typeof sourceFolders === "object" &&
              ancestorDirParts.length > 0 &&
              Object.prototype.hasOwnProperty.call(
                sourceFolders,
                ancestorDirParts[0]
              );
            const ancestorNamespace = ancestorInsideSourceRoot
              ? [
                  ...(ancestorEffectivePrefix ? [ancestorEffectivePrefix] : []),
                  ...(skipLeadingFolder
                    ? ancestorDirParts.slice(1)
                    : ancestorDirParts),
                ].join(".")
              : "";
            // Legacy .controller.(js|ts) files convert even with an empty namespace
            // (preserves the same exemption as shouldConvertClass for the controller path).
            const isControllerFile =
              opts.autoConvertUI5FileTypes !== false &&
              opts.autoConvertControllerClass !== false &&
              /.*[.]controller[.](js|ts)$/.test(ancestorFile);
            if (!ancestorNamespace && !isControllerFile) {
              // Ancestor would remain a native class — do not convert this descendant.
              return false;
            }
          }
          // F4: mark only the path that was actually matched, not every additionalUI5Classes
          // entry — to avoid suppressing valid "never matched" warnings for typo paths.
          if (opts.additionalUI5Classes?.includes(transitiveMatch)) {
            recordAdditionalUI5ClassMatch(transitiveMatch);
          }
          return true;
        }
      }
    }
  }
  // Convert classes in .view.* files based on filename suffix (requires namespace above).
  // .controller.* is already handled before the namespace guard to preserve legacy behaviour.
  if (
    opts.autoConvertUI5FileTypes !== false &&
    opts.autoConvertViewClass !== false &&
    /.*[.]view[.](js|ts|jsx|tsx)$/.test(file.opts.filename || "")
  ) {
    return true;
  }
  return false;
}
