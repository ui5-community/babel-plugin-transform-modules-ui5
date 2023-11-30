import { types as t } from "@babel/core";

import Path from "path";
import assignDefined from "object-assign-defined";

import * as th from "../../utils/templates";
import * as ast from "../../utils/ast";

import { getJsDocClassInfo, getTags } from "./jsdoc";
import { getDecoratorClassInfo } from "./decorators";
import { getImportDeclaration } from "./imports";

/**
 * Converts an ES6 class to a UI5 extend.
 * Any static methods or properties will be moved outside the class body.
 * The path will be updated with the new AST.
 */
export function convertClassToUI5Extend(
  path,
  node,
  classInfo,
  extraStaticProps,
  importDeclarationPaths,
  opts
) {
  if (!(t.isClassDeclaration(node) || t.isClassExpression(node))) {
    return node;
  }

  const CONTROLLER_EXTENSION_TAG = "transformControllerExtension";
  const staticMembers = [];

  const classNameIdentifier = node.id;
  const className = classNameIdentifier.name;
  const superClass = node.superClass; // Identifier node.
  const superClassName = superClass.name;

  const isController =
    className.includes("Controller") || !!classInfo.controller;

  const moveControllerConstructorToOnInit =
    isController && !!opts.moveControllerConstructorToOnInit;
  const moveControllerPropsToOnInit =
    isController &&
    (!!opts.moveControllerPropsToOnInit ||
      !!opts.moveControllerConstructorToOnInit);
  const moveStaticStaticPropsToExtend =
    isController && !!opts.addControllerStaticPropsToExtend;
  const alwaysMoveInstanceProps = !opts.onlyMoveClassPropsUsingThis;

  const extendProps = [];
  const boundProps = [];

  const CONSTRUCTOR = "constructor";
  const propsByName = {};
  let constructor;
  let constructorComments;

  const staticPropsToAdd = moveStaticStaticPropsToExtend
    ? Object.keys(extraStaticProps)
    : ["metadata", "renderer", "overrides"];

  for (const propName of staticPropsToAdd) {
    if (extraStaticProps[propName]) {
      extendProps.push(
        t.objectProperty(t.identifier(propName), extraStaticProps[propName])
      );
    }
  }

  for (const memberPath of path.get("body.body")) {
    const member = memberPath.node;
    const memberName = member.key.name;

    if (t.isClassMethod(member)) {
      const isConstructor = member.kind === "constructor";
      const membersToAssign = [];
      const params = isConstructor
        ? member.params?.map((param) => {
            // handling of parameter properties for constructors (TypeScript):
            // https://www.typescriptlang.org/docs/handbook/2/classes.html#parameter-properties
            //   -> extracting the real parameters and store the members to assign
            if (param.type === "TSParameterProperty") {
              membersToAssign.push(param.parameter);
              return param.parameter;
            }
            return param;
          })
        : member.params;
      const func = t.functionExpression(
        member.key,
        params,
        member.body,
        member.generator,
        member.async
      );
      if (isConstructor && membersToAssign.length > 0) {
        // handling of parameter properties for constructors (TypeScript):
        //   -> assigning parameter properties as members to the instance
        const newMembers = membersToAssign.map((member) =>
          buildMemberAssignmentStatement(t.thisExpression(), {
            key: member,
            computed: false,
            value: member,
          })
        );
        const superIndex = member.body.body.findIndex(
          (node) =>
            ast.isSuperCallExpression(node.expression) ||
            ast.isSuperPrototypeCallOf(
              node.expression,
              superClassName,
              "constructor"
            )
        );
        member.body.body.splice(
          superIndex === -1 ? member.body.body.length : superIndex + 1,
          0,
          ...newMembers
        );
      }
      if (member.static) {
        staticMembers.push(
          buildMemberAssignmentStatement(classNameIdentifier, {
            ...member,
            value: func,
          })
        );
      } else {
        propsByName[memberName] = func;
        if (member.kind === "get" || member.kind === "set") {
          extendProps.push(
            t.objectMethod(
              member.kind,
              member.key,
              member.params,
              member.body,
              member.computed
            )
          );
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
          extendProps.push(
            buildObjectProperty({
              ...member,
              value: func,
            })
          );
        }
      }
    } else if (t.isClassProperty(member)) {
      // For class properties annotated to represent controller extensions, replace the pure declaration with an assignment (that's what the runtime expects)
      // and keep them at the initialization object as properties (don't move into constructor).
      if (
        member.leadingComments?.some((comment) => {
          return comment.value.includes("@" + CONTROLLER_EXTENSION_TAG);
        }) ||
        member.decorators?.some((decorator) => {
          return decorator.expression?.name === CONTROLLER_EXTENSION_TAG;
        })
      ) {
        const typeAnnotation = member.typeAnnotation?.typeAnnotation;
        // double-check that it is a valid node for a controller extension
        if (
          t.isTSTypeReference(typeAnnotation) ||
          t.isTSQualifiedName(typeAnnotation)
        ) {
          const typeName = getTypeName(typeAnnotation);

          // 1. transform the property from being typed as instance and un-initialized to a property where the controller extension *class* is assigned as value
          const valueIdentifier = t.identifier(typeName);
          member.value = valueIdentifier;
          member.typeAnnotation = null;
          extendProps.unshift(buildObjectProperty(member)); // add it to the properties of the extend() config object

          // 2. add a binding reference to the value, so in case the TS transpiler runs later it recognizes that the import is still needed
          const typeNameFirstPart = typeName.split(".")[0]; // e.g. when "myExtension: someBundle.MyExtension"
          if (memberPath.scope.hasBinding(typeNameFirstPart)) {
            const binding = path.scope.getBinding(typeNameFirstPart);
            binding.referencePaths.push(memberPath.get("value"));
          }

          // 3. restore the import in case it was run already and removed the import
          const neededImportDeclaration = getImportDeclaration(
            memberPath.hub.file.opts.filename,
            typeName
          );
          if (
            !importDeclarationPaths.some(
              (path) => path.node === neededImportDeclaration
            )
          ) {
            // TODO: import might be there but with the specifier removed; we can clone, but then other specifiers are duplicate
            // if import is no longer there, re-add it
            importDeclarationPaths[
              importDeclarationPaths.length - 1
            ].insertAfter(neededImportDeclaration);
          }

          // 4. prevent the member from also being added to the constructor (member does have a value now and initializer would be added below)
          continue;
        }
      }

      if (!member.value) continue; // remove all other un-initialized static class props (typescript)

      // Special handling for TypeScript limitation where metadata, renderer and overrides must be properties.
      if (["metadata", "renderer", "overrides"].includes(memberName)) {
        if (opts.overridesToOverride && member.key.name === "overrides") {
          member.key.name = "override";
        }
        extendProps.unshift(buildObjectProperty(member));
      } else if (member.static) {
        if (moveStaticStaticPropsToExtend) {
          extendProps.unshift(buildObjectProperty(member));
        } else {
          staticMembers.push(
            buildMemberAssignmentStatement(classNameIdentifier, member)
          );
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
        if (
          alwaysMoveInstanceProps ||
          t.isArrowFunctionExpression(member.value) ||
          ast.isThisExpressionUsed(member.value)
        ) {
          boundProps.push(member);
        } else {
          extendProps.push(buildObjectProperty(member));
        }
      }
    }
  }

  // Arrow function properties need to get moved to the constructor so that
  // they're bound properly to the class instance, to align with the spec.
  // For controllers, use onInit rather than constructor, since controller constructors don't work.
  // Also move the constructor's statements to the onInit.

  const bindToConstructor = !moveControllerPropsToOnInit;
  const bindToMethodName = moveControllerPropsToOnInit
    ? "onInit"
    : "constructor";

  // avoid getting a prop named constructor as it may return {}'s
  let bindMethod = moveControllerPropsToOnInit
    ? propsByName[bindToMethodName]
    : constructor;

  const constructorJsdoc = getTags(constructorComments);

  const keepConstructor =
    !moveControllerConstructorToOnInit ||
    classInfo.keepConstructor ||
    constructorJsdoc.keep;

  // See if we need either constructor or onInit
  const needsBindingMethod =
    boundProps.length ||
    (moveControllerPropsToOnInit && constructor && !keepConstructor);

  // See if we need to create a new 'constructor' or 'onInit' method, depending which one we'll bind to.
  if (needsBindingMethod && !bindMethod) {
    const bindToId = t.identifier(bindToMethodName);
    const bindMethodDeclaration = bindToConstructor
      ? th.buildInheritingConstructor({
          SUPER: t.identifier(superClassName),
        })
      : th.buildInheritingFunction({
          NAME: bindToId,
          SUPER: t.identifier(superClassName),
        });
    bindMethod = ast.convertFunctionDeclarationToExpression(
      bindMethodDeclaration
    );
    extendProps.unshift(t.objectProperty(bindToId, bindMethod));
  }

  if (constructor && moveControllerPropsToOnInit) {
    if (keepConstructor) {
      extendProps.unshift(
        t.objectProperty(t.identifier(CONSTRUCTOR), constructor)
      );
    } else {
      // Copy all except the super call from the constructor to the bindMethod (i.e. onInit)
      bindMethod.body.body.unshift(
        ...constructor.body.body.filter(
          (node) =>
            !(
              ast.isSuperCallExpression(node.expression) ||
              ast.isSuperPrototypeCallOf(
                node.expression,
                superClassName,
                "constructor"
              )
            )
        )
      );
    }
  }

  if (boundProps.length) {
    // We need to inject the bound props into the bind method (constructor or onInit),
    // but not until after the super call (if applicable)

    const mappedProps = boundProps.map((member) =>
      buildThisMemberAssignmentStatement(member)
    );

    const superIndex = bindMethod.body.body.findIndex(
      (node) =>
        ast.isSuperCallExpression(node.expression) ||
        ast.isSuperPrototypeCallOf(
          node.expression,
          superClassName,
          bindToMethodName
        )
    );
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
    SUPER: superClass, // Needs Identifier node
    FQN: t.stringLiteral(getFullyQualifiedName(classInfo)),
    OBJECT: t.objectExpression(extendProps),
  });

  return [extendAssign, ...staticMembers];
}

function getFullyQualifiedName(classInfo) {
  if (classInfo.alias) return classInfo.alias;
  if (classInfo.name) return classInfo.name;
  const namespace = classInfo.namespace || classInfo.fileNamespace;
  const separator = namespace ? "." : "";
  return `${namespace}${separator}${classInfo.localName}`;
}

export function getClassInfo(path, node, parent, pluginOpts) {
  const defaults = {
    localName: node.id.name,
    superClassName: node.superClass && node.superClass.name,
    fileNamespace: getFileBaseNamespace(path, pluginOpts) || "",
  };
  const decoratorInfo = getDecoratorClassInfo(node);
  const jsDocInfo = getJsDocClassInfo(node, parent);

  // like Object.assign, but ignoring undefined values.
  return assignDefined(defaults, decoratorInfo, jsDocInfo);
}

/**
 * Reads the namespace from the file path (but not the name).
 */
function getFileBaseNamespace(path, pluginOpts) {
  const opts = path.hub.file.opts;
  const filename = Path.resolve(opts.filename);
  const sourceRoot = opts.sourceRoot
    ? Path.resolve(process.cwd(), opts.sourceRoot)
    : process.cwd();
  if (filename.startsWith(sourceRoot)) {
    const filenameRelative = Path.relative(sourceRoot, filename);
    const { dir } = Path.parse(filenameRelative);
    const namespaceParts = dir.split(Path.sep);
    if (pluginOpts.namespacePrefix) {
      namespaceParts.unshift(pluginOpts.namespacePrefix);
    }
    return namespaceParts.join(".");
  } else {
    return undefined;
  }
}

const getQualifiedName = (node) => {
  let { left, right } = node;

  // if left is TSQualifiedName, recursive call to get full namespace
  if (t.isTSQualifiedName(left)) {
    left = getQualifiedName(left);
  } else {
    // if left is an Identifier
    left = left.name;
  }

  return `${left}.${right.name}`;
};

export const getTypeName = (typeAnnotation) => {
  if (t.isTSTypeReference(typeAnnotation)) {
    // for TSTypeReference, typeName can be an Identifier or a TSQualifiedName
    return (
      typeAnnotation.typeName.name || getQualifiedName(typeAnnotation.typeName)
    );
  }
  if (t.isTSQualifiedName(typeAnnotation)) {
    // for TSQualifiedName
    return getQualifiedName(typeAnnotation);
  }
  return null;
};

const buildObjectProperty = (member) => {
  const newObjectProperty = t.objectProperty(
    member.key,
    member.value,
    member.computed
  );
  newObjectProperty.leadingComments = member.leadingComments;
  return newObjectProperty;
};

const buildMemberAssignmentStatement = (objectIdentifier, member) => {
  const newMember = t.expressionStatement(
    t.assignmentExpression(
      "=",
      t.memberExpression(objectIdentifier, member.key, member.computed),
      member.value
    )
  );
  newMember.leadingComments = member.leadingComments;
  return newMember;
};

const buildThisMemberAssignmentStatement = buildMemberAssignmentStatement.bind(
  null,
  t.thisExpression()
);
