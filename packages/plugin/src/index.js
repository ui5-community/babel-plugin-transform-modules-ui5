
import { types as t } from "@babel/core";
import * as th from "./helpers/templates";
import * as ast from "./helpers/ast";

import * as classes from "./helpers/classes";
import { hasJsdocGlobalExportFlag } from "./helpers/jsdoc";
import { wrap } from "./helpers/wrapper";

/*
References:
Babel Plugin Handbook: https://github.com/thejameskyle/babel-handbook/blob/master/translations/en/plugin-handbook.md
AST Spec: https://github.com/babel/babel/blob/master/packages/babel-parser/ast/spec.md
Babel Types (t.*) https://github.com/babel/babel/tree/master/packages/babel-types
AST Explorer: https://astexplorer.net/
*/

const CONSTRUCTOR = "constructor";
const tempModuleName = (name) => `__${name}`;
const cleanImportSource = (src) => src.replace(/(\/)|(-)/g, "_").replace(/\./g, "");

module.exports = () => {

  const ProgramVisitor = {
    // Use a ProgramVisitor to efficiently avoid processing the same file twice if babel calls twice.
    // The UI5ModuleVisitor will only be used if it hasn't let ran.
    Program(path, { opts }) {
      if (this.ran) return;
      this.ran = true;
      let { node } = path;

      if (opts.onlyConvertNamedClass == false) {
        throw new Error("ERROR: onlyConvertNamedClass=false is no longer supported. Use autoConvertAllExtendClassesByDefault=true");
      }
      // TODO: enable this in a later version
      // else if (opts.onlyConvertNamedClass == true) {
      //   console.warn('WARN: onlyConvertNamedClass=true is now the default behaviour') // eslint-disable-line no-console
      // }

      this.defaultExport = null;
      this.defaultExportNode = null;
      this.exportGlobal = false;
      this.imports = [];
      this.namedExports = [];
      this.requires = [];
      this.injectDynamicImportHelper = false;
      this.programNode = node;

      // Opts handling
      this.namespacePrefix = opts.namespacePrefix;
      this.noImportInteropPrefixes = opts.noImportInteropPrefixes || ["sap/"];
      this.noImportInteropPrefixesRegexp = new RegExp(this.noImportInteropPrefixes.map(p => `(^${p}.*)`).join("|"));

      path.traverse(UI5ModuleVisitor, this);

      const needsWrap = !!(this.defaultExport || this.imports.length || this.namedExports.length || this.injectDynamicImportHelper);
      if (needsWrap) {
        wrap(this, node, opts);
      }
    }
  };

  const UI5ModuleVisitor = {

    /*!
     * Removes the ES6 import and adds the details to the import array in our state.
     */
    ImportDeclaration(path) { // { opts = {} }
      const { node } = path;

      const { specifiers, source } = node;
      const src = source.value.replace(/\\/g, "/");

      const shouldInterop = !this.noImportInteropPrefixesRegexp.test(src);

      // NOTE: DO NOT REMOVE. This code is for future enhancements, not old logic.
      // const testLibs = opts.libs || ['^sap/']
      // const isLibRE = testLibs.length && new RegExp(`(${testLibs.join('|')})`)
      // const isLib = isLibRE.test(src)
      // const testSrc = (opts.libs || ['^sap/']).concat(opts.files || [])
      // const isUi5SrcRE = testSrc.length && new RegExp(`(${testSrc.join('|')})`)
      // const isUi5Src = isUi5SrcRE.test(src)

      const name = cleanImportSource(src); // default to the src for import without named var

      const existingImport = this.imports.find(imp => imp.src === src);
      const imp = existingImport || {
        src, // url
        name,
        // isLib, // for future use separating UI5 imports from npm/webpack imports
        // isUi5Src, // not used yet
        tmpName: (shouldInterop ? tempModuleName(name) : name),
        destructors: [],
        default: false,
        interop: false,
        path: path,
        locked: false
      };

      const destructors = [];

      for (const specifier of specifiers) {
        if (t.isImportDefaultSpecifier(specifier)) { // import X from 'X'
          imp.default = true;
          imp.interop = shouldInterop;

          // Shorten the imported-as name since it should be unique for default imports.
          // The default import should always come first,
          // so this new name will be used for destructuring the other too.
          if (!imp.locked) {
            imp.name = specifier.local.name;
            imp.tmpName = shouldInterop ? tempModuleName(imp.name) : imp.name;
            imp.locked = true;
          }

          if (shouldInterop) {
            destructors.push(
              th.buildDefaultImportDestructor({
                MODULE: t.identifier(imp.tmpName),
                LOCAL: specifier.local,
              })
            );
          }
        }
        else if (t.isImportNamespaceSpecifier(specifier)) {
          // console.log(specifier)
          if (specifiers.length === 1 && !imp.locked) { // import * as X from 'X'
            // If the namespace specifier is the only import, we can avoid the temp name and the destructor
            imp.name = specifier.local.name;
            imp.tmpName = specifier.local.name;
            imp.locked = true;
          }
          else { // import X, * as X2 from 'X'
            // Else it's probably combined with a default export. keep the tmpName and destruct it
            destructors.push(
              th.buildConstDeclaration({
                NAME: specifier.local,
                VALUE: t.identifier(imp.tmpName),
              })
            );
          }
        }
        else if (t.isImportSpecifier(specifier)) { // import { A } from 'X'
          destructors.push(
            th.buildNamedImportDestructor({
              MODULE: t.identifier(imp.tmpName),
              LOCAL: specifier.local,
              IMPORTED: t.stringLiteral(specifier.imported.name)
            })
          );
        }
        else {
          throw path.buildCodeFrameError(`Unknown ImportDeclaration specifier type ${specifier.type}`);
        }
      }

      path.replaceWithMultiple(destructors);
      if (destructors.length) {
        imp.locked = true;
      }

      imp.destructors = imp.destructors.concat(destructors);

      // TODO: now that we're saving destructors on the imp, dynamically determine firstImport if needed.
      if (!this.firstImport && imp.destructors[0]) {
        this.firstImport = imp.destructors[0];
      }

      if (!existingImport) {
        this.imports.push(imp);
      }
    },

    /**
     * Push all exports to an array.
     * The reason we don't export in place is to handle the situation
     * where a let or var can be defined, and the latest one should be exported.
     */
    ExportNamedDeclaration(path) {
      const { node } = path;
      const { specifiers, declaration, source } = node;

      let fromSource = "";
      if (source) { // export { one, two } from 'x'
        const src = source.value;
        const name = cleanImportSource(src);
        const tmpName = tempModuleName(name);
        this.imports.push({ src, name, tmpName });
        fromSource = tmpName + ".";
      }

      if (specifiers && specifiers.length) { // export { one, two }
        for (const specifier of path.node.specifiers) {
          this.namedExports.push({
            key: specifier.exported,
            value: t.identifier(`${fromSource}${specifier.local.name}`),
          });
        }
        path.remove();
      }
      else if (declaration) { // export const c = 1 | export function f() {}
        if (declaration.type === "TSInterfaceDeclaration") return;
        const name = ast.getIdName(declaration);
        if (name) { // export function f() {}
          const id = t.identifier(declaration.id.name);
          this.namedExports.push({
            key: id,
            value: id,
            declaration
          });
        }
        else if (declaration.declarations) { // export const c = 1
          for (const subDeclaration of declaration.declarations) {
            const id = t.identifier(subDeclaration.id.name);
            this.namedExports.push({
              value: id,
              key: id,
              declaration: subDeclaration
            });
          }
        }
        else {
          throw path.buildCodeFrameError("Unknown ExportNamedDeclaration shape.");
        }
        path.replaceWith(declaration);
      }
      else {
        throw path.buildCodeFrameError("Unknown ExportNamedDeclaration shape.");
      }
    },

    /*!
     * Replaces the ES6 export with sap.ui.define by using the state.imports array built up when
     * visiting ImportDeclaration.
     * Only a single 'export default' is supported.
     */
    ExportDefaultDeclaration(path) {
      const { node } = path;
      const { declaration } = node;
      const declarationName = ast.getIdName(declaration);
      if (hasGlobalExportFlag(node)) { // check for jsdoc @export
        this.exportGlobal = true;
      }
      if (declarationName) {
        // ClassDeclaration or FunctionDeclaration with name.
        // Leave the declaration in-line and preserve the identifier for the return statement.
        path.replaceWith(declaration);
        this.defaultExport = t.identifier(declarationName);
      }
      else {
        // Identifier, ObjectExpression or anonymous FunctionDeclaration
        // Safe to move to the end and return directly
        if (t.isFunctionDeclaration(declaration)) {
          const { params, body, generator, async: isAsync } = declaration;
          this.defaultExport = t.functionExpression(null, params, body, generator, isAsync);
        }
        else {
          this.defaultExport = declaration;
        }
        path.remove();
      }
    },

    ExportAllDeclaration(path) {
      const src = path.node.source.value;
      const name = src.replace(/\//g, "_").replace(/\./g, "");
      const tmpName = tempModuleName(name);

      this.imports.push({ src, name, tmpName });

      this.exportAllHelper = true;

      this.namedExports.push({
        all: true,
        value: t.identifier(tmpName),
      });

      path.remove();
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
        if (!doesClassExtendFromImport(node, [...this.imports, ...this.requires])) {
          // If it doesn't extend from an import, treat it as plain ES2015 class.
          return;
        }
        // If the super class is one of the imports, we'll assume it's a UI5 managed class,
        // and therefore may need to be transformed to .extend() syntax.
        const { name } = node.id;
        const classInfo = classes.getClassInfo(path, node, path.parent, opts);
        if (classInfo.nonUI5) {
          return;
        }

        let shouldConvert = (!!opts.autoConvertAllExtendClasses) // default false
          || (classInfo.name || classInfo.alias)
          || (/.*[.]controller[.]js$/.test(file.opts.filename) && opts.autoConvertControllerClass !== false); // default true

        // console.log(/.*[.]controller[.]js$/.test(file.opts.filename))
        // console.log(opts.autoConvertControllerClass !== false)
        // console.log((/.*[.]controller[.]js$/.test(file.opts.filename) && opts.autoConvertControllerClass !== false))
        // console.log(shouldConvert)

        if (/.*[.]controller[.]js$/.test(file.opts.filenam) && opts.autoConvertControllerClass !== false) {
          shouldConvert = true;
        }

        if (!shouldConvert) {
          return;
        }

        this.superClassName = classInfo.superClassName;

        // Find the Block scoped parent (Program or Function body) and search for assigned properties within that.
        const blockParent = path.findParent(path => path.isBlock()).node;
        const staticProps = ast.groupPropertiesByName(ast.getOtherPropertiesOfIdentifier(blockParent, name));
        // TODO: flag metadata and renderer for removal if applicable
        const ui5ExtendClass = classes.convertClassToUI5Extend(path, node, classInfo, staticProps, opts);

        if (path.isClassDeclaration()) { // class X {}
          path.replaceWithMultiple(ui5ExtendClass);
        }
        else if (path.isClassExpression()) { // return class X {}
          if (t.isReturnStatement(parent)) {
            // Add the return statement back before calling replace
            ui5ExtendClass.push(th.buildReturn({
              ID: t.identifier(classInfo.localName)
            }));
          }
          parentPath.replaceWithMultiple(ui5ExtendClass);
        }
      },
      exit() {
        this.superClassName = null;
      }
    },

    /*!
     * Visits function calls.
     */
    CallExpression(path) {
      const { node } = path;
      const { callee } = node;
      if (ast.isImport(callee)) {
        this.injectDynamicImportHelper = true;
        path.replaceWith({
          ...node,
          callee: t.identifier("__ui5_require_async")
        });
      }
      // If the file already has sap.ui.define, get the names of variables it creates to use for the class logic.
      else if (ast.isCallExpressionCalling(node, "sap.ui.define")) {
        this.requires = getRequiredParamsOfSAPUIDefine(path, node);
        return;
      }
      else if (this.superClassName) {
        if (t.isSuper(callee)) {
          replaceConstructorSuperCall(path, node, this.superClassName);
        }
        else if (t.isSuper(callee.object)) {
          replaceObjectSuperCall(path, node, this.superClassName);
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
              node.body)));
      }
    }

  };

  function getRequiredParamsOfSAPUIDefine(path, node) {
    const defineArgs = node.arguments;
    const callbackNode = defineArgs
      .find(argNode => (t.isFunction(argNode)));
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

  function replaceSuperNamedCall(path, node, superClassName, methodName) {
    // .call() is better for simple args (or not args) but doesn't work right for spread args
    // if it gets further transpiled by babel spread args transform (will be .call.apply(...).
    const thisEx = t.thisExpression();
    const hasSpread = node.arguments.some(t.isSpreadElement);
    const caller = (hasSpread ? "apply" : "call");
    const callArgs = (hasSpread
      ? [thisEx, t.arrayExpression(node.arguments)]
      : [thisEx, ...node.arguments]
    );
    // console.log(callArgs)
    path.replaceWith(
      t.callExpression(t.identifier(`${superClassName}.prototype.${methodName}.${caller}`), callArgs)
    );
  }

  function doesClassExtendFromImport(node, imports) {
    const superClass = node.superClass;
    if (!superClass) {
      return false;
    }
    const isImported = imports.some(imported => imported.name === superClass.name);
    return isImported;
  }

  function hasGlobalExportFlag(node) {
    return hasJsdocGlobalExportFlag(node);
  }

  return {
    visitor: ProgramVisitor
  };
};
