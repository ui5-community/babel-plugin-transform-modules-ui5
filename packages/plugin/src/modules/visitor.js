import { types as t } from "@babel/core";
import * as th from "../utils/templates";
import * as ast from "../utils/ast";

import { hasJsdocGlobalExportFlag } from "../classes/helpers/jsdoc";

const tempModuleName = (name) => `__${name}`;
const cleanImportSource = (src) =>
  src.replace(/(\/)|(-)|(@)/g, "_").replace(/\./g, "");
const hasGlobalExportFlag = (node) => hasJsdocGlobalExportFlag(node);

export const ModuleTransformVisitor = {
  /*!
   * Removes the ES6 import and adds the details to the import array in our state.
   */
  ImportDeclaration(path, { opts = {}, ...state }) {
    const { node } = path;

    if (node.importKind === "type") return; // flow-type

    const { specifiers, source } = node;
    const src = source.value.replace(/\\/g, "/");

    // When 'libs' are used, only 'libs' will be converted to UI5 imports.
    const { libs = [".*"] } = opts;
    const isLibToConvert = new RegExp(`(${libs.join("|")})`).test(src);
    if (!isLibToConvert) {
      this.ignoredImports.push(node);
      path.remove();
      return;
    }

    //const testSrc = (opts.libs || ["^sap/"]).concat(opts.files || []);
    // const isUi5SrcRE = testSrc.length && new RegExp(`(${testSrc.join("|")})`);
    // const isUi5Src = isUi5SrcRE.test(src);

    // Importing using an interop is the default behaviour but can be opt-out using regex.
    const shouldInterop = !this.noImportInteropPrefixesRegexp.test(src);

    const name = cleanImportSource(src); // default to the src for import without named var

    const { modulesMap = {} } = opts;
    const mappedSrc =
      (typeof modulesMap === "function"
        ? modulesMap(src, {
            node,
            opts,
            cwd: state.cwd,
            filename: state.filename,
            file: {
              opts: state.file.opts,
            },
          })
        : modulesMap[src]) || src;

    // Note that existingImport may get mutated if there are multiple import lines from the same module.
    const existingImport = this.imports.find((imp) => imp.src === mappedSrc);

    const imp = existingImport || {
      src: mappedSrc, // url
      name,
      // isLib, // for future use separating UI5 imports from npm/webpack imports
      // isUi5Src, // not used yet
      tmpName: shouldInterop ? tempModuleName(name) : name,
      deconstructors: [],
      default: false,
      interop: false,
      path: path,
      locked: false,
    };

    const deconstructors = [];

    for (const specifier of specifiers) {
      if (t.isImportDefaultSpecifier(specifier)) {
        // e.g. import X from 'X'
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
          deconstructors.push(
            th.buildDefaultImportDeconstructor({
              MODULE: t.identifier(imp.tmpName),
              LOCAL: specifier.local,
            })
          );
        }
      } else if (t.isImportNamespaceSpecifier(specifier)) {
        if (specifiers.length === 1 && !imp.locked) {
          // e.g. import * as X from 'X'
          // If the namespace specifier is the only import, we can avoid the temp name and the destructor
          imp.name = specifier.local.name;
          imp.tmpName = specifier.local.name;
          imp.locked = true; // Don't let another import line for the same module change the name.
        } else {
          // e.g. import X, * as X2 from 'X'
          // Else it's probably combined with a default export. keep the tmpName and destructure it
          deconstructors.push(
            th.buildConstDeclaration({
              NAME: specifier.local,
              VALUE: t.identifier(imp.tmpName),
            })
          );
        }
      } else if (t.isImportSpecifier(specifier)) {
        // e.g. import { A } from 'X'
        deconstructors.push(
          th.buildNamedImportDestructor({
            MODULE: t.identifier(imp.tmpName),
            LOCAL: specifier.local,
            IMPORTED: t.stringLiteral(specifier.imported.name),
          })
        );
      } else {
        throw path.buildCodeFrameError(
          `Unknown ImportDeclaration specifier type ${specifier.type}`
        );
      }
    }

    path.replaceWithMultiple(deconstructors);

    if (deconstructors.length) {
      // Keep the same variable name if the same module is imported on another line.
      imp.locked = true;
    }

    imp.deconstructors = imp.deconstructors.concat(deconstructors);

    // TODO: now that we're saving deconstructors on the import, dynamically determine firstImport if needed.
    if (!this.firstImport && imp.deconstructors[0]) {
      this.firstImport = imp.deconstructors[0];
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
    if (source) {
      // e.g. export { one, two } from 'x'
      const src = source.value;
      const name = cleanImportSource(src);
      const tmpName = tempModuleName(name);
      this.imports.push({ src, name, tmpName });
      fromSource = tmpName + ".";
    }

    if (specifiers && specifiers.length) {
      // e.g. export { one, two }
      for (const specifier of path.node.specifiers) {
        this.namedExports.push({
          key: specifier.exported,
          value: t.identifier(`${fromSource}${specifier.local.name}`),
        });
      }
      path.remove();
    } else if (declaration) {
      // e.g. export const c = 1 | export function f() {}
      if (
        [
          "TypeAlias",
          "InterfaceDeclaration",
          "TSInterfaceDeclaration",
          "TSTypeAliasDeclaration",
        ].includes(declaration.type)
      )
        return; // TS or Flow-types
      const name = ast.getIdName(declaration);
      if (name) {
        // e.g. export function f() {}
        const id = t.identifier(declaration.id.name);
        this.namedExports.push({
          key: id,
          value: id,
          declaration,
        });
      } else if (declaration.declarations) {
        // e.g. export const c = 1
        for (const subDeclaration of declaration.declarations) {
          const id = t.identifier(subDeclaration.id.name);
          this.namedExports.push({
            value: id,
            key: id,
            declaration: subDeclaration,
          });
        }
      } else {
        throw path.buildCodeFrameError("Unknown ExportNamedDeclaration shape.");
      }
      path.replaceWith(declaration);
    } else {
      path.remove();
      return;
    }
  },

  ExportDefaultDeclaration(path) {
    const { node } = path;
    let { declaration } = node;
    const declarationName = ast.getIdName(declaration);
    if (hasGlobalExportFlag(node)) {
      // check for jsdoc @export
      this.exportGlobal = true;
    }
    if (declarationName) {
      // ClassDeclaration or FunctionDeclaration with name.
      // Leave the declaration in-line and preserve the identifier for the return statement.
      path.replaceWith(declaration);
      this.defaultExport = t.identifier(declarationName);
    } else if (t.isIdentifier(declaration)) {
      this.defaultExport = declaration;
      path.remove();
    } else {
      // anonymous ObjectExpression or anonymous FunctionDeclaration
      if (t.isFunctionDeclaration(declaration)) {
        const { params, body, generator, async: isAsync } = declaration;
        declaration = t.functionExpression(
          null,
          params,
          body,
          generator,
          isAsync
        );
      }
      const exportDeclaration = th.buildTempExport({
        VALUE: declaration,
      });
      path.replaceWith(exportDeclaration);
      this.defaultExport = th.exportsIdentifier;
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

  /*!
   * Visits function calls to handle for dynamic imports.
   */
  CallExpression(path) {
    const { node } = path;
    const { callee } = node;
    if (ast.isImport(callee)) {
      this.injectDynamicImportHelper = true;
      path.replaceWith({
        ...node,
        callee: t.identifier("__ui5_require_async"),
      });
    }
  },
};
