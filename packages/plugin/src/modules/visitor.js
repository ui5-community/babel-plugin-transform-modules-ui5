import { join, dirname, resolve } from "path";
import { existsSync, statSync } from "fs";

import { types as t, template } from "@babel/core";
import * as th from "../utils/templates";
import * as ast from "../utils/ast";

import { hasJsdocGlobalExportFlag } from "../classes/helpers/jsdoc";

const resolveSource = (src, filename) => {
  src = src.replace(/\\/g, "/");
  const dir = dirname(filename);
  const absoluteSrc = join(dir, src);
  if (existsSync(absoluteSrc) && statSync(absoluteSrc).isDirectory) {
    if (
      existsSync(join(absoluteSrc, "index.js")) ||
      existsSync(join(absoluteSrc, "index.jsx")) ||
      existsSync(join(absoluteSrc, "index.ts")) ||
      existsSync(join(absoluteSrc, "index.tsx")) ||
      existsSync(join(absoluteSrc, "index.mjs")) ||
      existsSync(join(absoluteSrc, "index.cjs"))
    ) {
      src = `${src}/index`;
    }
  }
  return src;
};
const cleanImportSource = (src) =>
  src.replace(/(\/)|(-)|(@)/g, "_").replace(/\./g, "");
const tempModuleName = (name) => `__${name}`;
const hasGlobalExportFlag = (node) => hasJsdocGlobalExportFlag(node);
const addImport = (imports, imp, filename, first) => {
  const existingImport = imports.find((i) => i.src === imp.src);
  if (!existingImport) {
    // if a module path ends with the file extension ".js" and it can be resolved to
    // a local file having also the file extension ".js" and not ".js.js" then
    // we need to slice the file extension to avoid redundant file extension
    // (the require/define of UI5 always adds the file extension ".js" to the module name)
    if (/^(?:(@[^/]+)\/)?([^/]+)\/(.*)\.js$/.test(imp.src)) {
      try {
        let modulePath;
        let absModuleSrc = imp.src;
        // if the module has a relative path, resolve it to an absolute path
        // and verify if the file exists, if not, try to resolve it as a module
        if (/^\.\.?\//.test(absModuleSrc)) {
          absModuleSrc = resolve(dirname(filename), absModuleSrc);
          // handle the fallback of module names introduced with Node 20.0.0
          [".js", ".jsx", ".ts", ".tsx"].some((ext) => {
            if (existsSync(absModuleSrc.replace(/\.js$/, ext))) {
              modulePath = imp.src;
              return true;
            }
          });
        } else {
          modulePath = require.resolve(absModuleSrc);
        }
        // detect removal of file extension and log a hint
        if (modulePath.endsWith(imp.src.split("/").pop())) {
          console.log(
            `\x1b[33mHint:\x1b[0m Removed file extension for dependency "\x1b[34m${imp.src}\x1b[0m" found in \x1b[90m${filename}\x1b[0m`
          );
          imp.src = imp.src.slice(0, -3);
        }
      } catch (ex) {
        // ignore the error, do not slice file extension as the module
        // can't be resolved with the given file extension, e.g.
        // myns/module.js must be provided as myns/module
        // myns/module.js.js must be provided as myns/module.js
      }
    }
    imports[first ? "unshift" : "push"](imp);
  }
};
const addModuleImport = (imports, name, filename) => {
  addImport(
    imports,
    {
      src: name,
      name: name,
      tmpName: name,
    },
    filename,
    true
  );
};

export const ModuleTransformVisitor = {
  /*!
   * Removes the ES6 import and adds the details to the import array in our state.
   */
  ImportDeclaration(path, { filename, opts = {}, ...state }) {
    const { node } = path;

    if (node.importKind === "type") return; // flow-type

    const { specifiers, source } = node;
    const src = resolveSource(source.value, filename);

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

    // this is the very first import in noWrapBeforeImport mode and there are sibling nodes before this import
    if (
      opts.noWrapBeforeImport &&
      !this.firstImportMarked &&
      path.inList &&
      path.key > 0
    ) {
      // mark the direct predecessor as the last one to exclude from wrapping
      path.getSibling(path.key - 1).node.lastBeforeWrapping = true;
      this.firstImportMarked = true;
    }

    path.replaceWithMultiple(deconstructors);

    if (deconstructors.length) {
      // Keep the same variable name if the same module is imported on another line.
      imp.locked = true;
    }

    imp.deconstructors = imp.deconstructors.concat(deconstructors);

    if (!existingImport) {
      addImport(this.imports, imp, filename);
    }
  },

  /**
   * Push all exports to an array.
   * The reason we don't export in place is to handle the situation
   * where a let or var can be defined, and the latest one should be exported.
   */
  ExportNamedDeclaration(path, { filename }) {
    const { node } = path;
    const { specifiers, declaration, source } = node;

    let fromSource = "";
    if (source) {
      // e.g. export { one, two } from 'x'
      const src = resolveSource(source.value, filename);
      const name = cleanImportSource(src);
      const tmpName = tempModuleName(name);
      addImport(this.imports, { src, name, tmpName }, filename);
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

  ExportDefaultDeclaration(path, { filename }) {
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

  ExportAllDeclaration(path, { filename }) {
    const src = resolveSource(path.node.source.value, filename);
    const name = cleanImportSource(src);
    const tmpName = tempModuleName(name);

    addImport(this.imports, { src, name, tmpName }, filename);

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

  MemberExpression(path, { filename }) {
    const { node } = path;
    if (node?.object?.type === "MetaProperty") {
      // replace all "import.meta.url" with "module.url"
      if (node?.property?.name === "url") {
        path.replaceWith({
          ...node,
          ...template`module.url`(),
        });
        addModuleImport(this.imports, "module", filename);
      }
      // replace all "import.meta.resolve(...)" with "require.toUrl(...)"
      else if (node?.property?.name === "resolve") {
        path.replaceWith({
          ...node,
          ...template`require.toUrl`(),
        });
        addModuleImport(this.imports, "require", filename);
      }
    }
  },
};
