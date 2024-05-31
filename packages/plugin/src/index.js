import { ClassTransformVisitor } from "./classes/visitor";
import { ClassPre } from "./classes/pre";
import { ModuleTransformVisitor } from "./modules/visitor";

import { wrap } from "./modules/helpers/wrapper";

/*
References:
Babel Plugin Handbook: https://github.com/thejameskyle/babel-handbook/blob/master/translations/en/plugin-handbook.md
AST Spec: https://github.com/babel/babel/blob/master/packages/babel-parser/ast/spec.md
Babel Types (t.*) https://github.com/babel/babel/tree/master/packages/babel-types
AST Explorer: https://astexplorer.net/
*/

module.exports = () => {
  const UI5Visitor = {
    Program: {
      enter(path, { opts }) {
        if (this.ran) return;
        this.ran = true;

        if (opts.onlyConvertNamedClass == false) {
          throw new Error(
            "ERROR: onlyConvertNamedClass=false is no longer supported. Use autoConvertAllExtendClassesByDefault=true"
          );
        }
        // TODO: enable this in a later version
        // else if (opts.onlyConvertNamedClass == true) {
        //   console.warn('WARN: onlyConvertNamedClass=true is now the default behaviour') // eslint-disable-line no-console
        // }

        // Opts
        this.namespacePrefix = opts.namespacePrefix;
        this.noImportInteropPrefixes = opts.noImportInteropPrefixes || ["sap/"];
        this.noImportInteropPrefixesRegexp = new RegExp(
          this.noImportInteropPrefixes.map((p) => `(^${p}.*)`).join("|")
        );

        // Properties for Module Transform
        this.programNode = path.node;
        this.parent = path.parent;
        this.defaultExport = null;
        this.defaultExportNode = null;
        this.exportGlobal = false;
        this.ignoredImports = [];
        this.imports = [];
        this.namedExports = [];
        this.injectDynamicImportHelper = false;

        // Properties for Class Transform
        this.importNames = [];
        this.importDeclarationPaths = [];

        // The classes must be converted right away before any other class transforms get a chance to run.
        path.traverse(ClassTransformVisitor, this);
      },
      exit(path, { opts }) {
        path.traverse(
          { ImportDeclaration: ModuleTransformVisitor.ImportDeclaration },
          this
        );
        wrap(this, path.node, opts);
      },
    },
    // The module transform visitor uses normal traversal so we capture
    // imports and helper code that get added by other transforms.
    ...ModuleTransformVisitor,
  };

  return {
    pre: ClassPre,
    visitor: UI5Visitor,
  };
};
