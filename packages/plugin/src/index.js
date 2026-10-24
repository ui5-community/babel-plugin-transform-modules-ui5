import { ClassTransformVisitor } from "./classes/visitor";
import { ClassPre } from "./classes/pre";
import { getUnmatchedAdditionalUI5Classes } from "./classes/helpers/imports";
import { ModuleTransformVisitor } from "./modules/visitor";

import { wrap } from "./modules/helpers/wrapper";

/*
References:
Babel Plugin Handbook: https://github.com/thejameskyle/babel-handbook/blob/master/translations/en/plugin-handbook.md
AST Spec: https://github.com/babel/babel/blob/master/packages/babel-parser/ast/spec.md
Babel Types (t.*) https://github.com/babel/babel/tree/master/packages/babel-types
AST Explorer: https://astexplorer.net/
*/

// Accumulates every additionalUI5Classes path seen across all post() invocations.
// A single process.on('exit') handler (registered once) checks this set so that all
// configured paths — even those from different plugin instances in the same build — are
// covered. Without this, the closure in the first post() call would only see the first
// invocation's options array.
//
// NOTE: The warning fires once per Node process (at exit), not once per build. In a
// long-lived process that runs many builds (watch mode, programmatic transform loops) the
// paths accumulate across all of them and the warning reports the union at process exit.
// There is no reliable per-build boundary at the Babel plugin level to scope this to a
// single build, so the per-process behaviour is intentional for the common one-shot CLI case.
let allConfiguredUI5ClassPaths = null;
let exitHandlerRegistered = false;

module.exports = () => {
  const UI5Visitor = {
    Program: {
      enter(path, { opts }) {
        if (this.ran) return;
        this.ran = true;

        if (opts.onlyConvertNamedClass == false) {
          throw new Error(
            "ERROR: onlyConvertNamedClass=false is no longer supported. Use autoConvertAllExtendClasses=true"
          );
        }
        // TODO: enable this in a later version
        // else if (opts.onlyConvertNamedClass == true) {
        //   console.warn('WARN: onlyConvertNamedClass=true is now the default behaviour') // eslint-disable-line no-console
        // }

        // Opts
        this.namespacePrefix = opts.namespacePrefix;
        this.dependencies = Array.isArray(opts.dependencies)
          ? opts.dependencies
          : [];
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
        this.noWrap = (path.parent?.comments ?? []).some(
          (c) => c.type === "CommentBlock" && c.value.trim() === "@ui5-no-wrap"
        );

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
    post() {
      // F5: use this.opts (plugin options), not the Babel file opts passed as argument.
      // F6: defer the warning to process exit so it fires once after all files are done,
      //     avoiding false positives when a valid path is only imported in a later file.
      const additionalUI5Classes = this.opts?.additionalUI5Classes;
      if (!additionalUI5Classes?.length) return;
      // Accumulate all configured paths across every post() invocation so that builds
      // using multiple Babel configs or programmatic transforms don't miss any list.
      if (!allConfiguredUI5ClassPaths) allConfiguredUI5ClassPaths = new Set();
      for (const p of additionalUI5Classes) allConfiguredUI5ClassPaths.add(p);
      if (!exitHandlerRegistered) {
        exitHandlerRegistered = true;
        process.on("exit", () => {
          const unmatched = getUnmatchedAdditionalUI5Classes([
            ...allConfiguredUI5ClassPaths,
          ]);
          for (const p of unmatched) {
            console.warn(
              `\x1b[33mWarn:\x1b[0m additionalUI5Classes: path "\x1b[34m${p}\x1b[0m" was never matched by any import in this build. Check for typos.`
            );
          }
        });
      }
    },
    visitor: UI5Visitor,
  };
};
