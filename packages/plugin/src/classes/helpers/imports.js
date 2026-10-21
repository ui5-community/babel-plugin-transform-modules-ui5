import { types as t } from "@babel/core";
import * as Path from "path";

let importDeclarations = {};

// Maps "filename\0superclassLocalName" → the import source path of that superclass.
// Used to check whether a class's superclass comes from a known UI5 base-class path.
let superclassImportSources = {};

// Maps "filename\0className" → the local binding name of that class's superclass in the
// same file. Allows transitive lookup: given a descendant that imports class Foo from a
// file, look up file\0Foo to get Foo's superclass binding name, then use that binding
// name to look up superclassImportSources. This correctly follows the exported class's
// superclass chain rather than any sibling class's chain.
let classSuperclassNames = {};

export const saveImports = (file) => {
  const filename = file.opts.filename;
  // Clear any stale superclass entries for this file so watch-mode rebuilds
  // don't carry over superclasses that no longer apply.
  const prefix = filename + "\0";
  for (const key of Object.keys(superclassImportSources)) {
    if (key.startsWith(prefix)) delete superclassImportSources[key];
  }
  for (const key of Object.keys(classSuperclassNames)) {
    if (key.startsWith(prefix)) delete classSuperclassNames[key];
  }
  // save all import declarations before "unneeded" ones are removed by the TypeScript plugin
  const imports = file.ast.program.body.filter(t.isImportDeclaration);
  // right now even the removed import still exists later and can be re-added. Otherwise do: .map(decl => t.cloneNode(decl));
  importDeclarations[filename] = imports;

  // Eagerly record class→superclass relationships from the AST so that transitive
  // detection works regardless of file-processing order. The class visitor also calls
  // saveSuperclassImportSource() for classes it converts, but that happens too late
  // when a descendant file is transformed before this ancestor file in the Babel run.
  const importBindings = new Map(); // local binding name → import source
  for (const decl of imports) {
    for (const specifier of decl.specifiers) {
      if (
        t.isImportDefaultSpecifier(specifier) ||
        t.isImportNamespaceSpecifier(specifier) ||
        t.isImportSpecifier(specifier)
      ) {
        importBindings.set(specifier.local.name, decl.source.value);
      }
    }
  }

  for (const stmt of file.ast.program.body) {
    // Handle: class Foo extends Bar {} and export default class Foo extends Bar {}
    const classNode = t.isClassDeclaration(stmt)
      ? stmt
      : t.isExportDefaultDeclaration(stmt) &&
          t.isClassDeclaration(stmt.declaration)
        ? stmt.declaration
        : null;
    if (!classNode) continue;
    const className = classNode.id?.name;
    const superName = classNode.superClass?.name;
    if (!className || !superName) continue;
    const importSource = importBindings.get(superName);
    if (importSource) {
      superclassImportSources[filename + "\0" + superName] = importSource;
      classSuperclassNames[filename + "\0" + className] = superName;
    }
  }
};

/**
 * Record the superclass import source and superclass name for a class in a file.
 * Called from the visitor when a class extending an import is encountered.
 * Used later for transitive resolution.
 *
 * @param {string} filename              Absolute path of the file being processed.
 * @param {string} className             The class's own local name (node.id.name).
 * @param {string} superclassLocalName   Local binding name of the superclass in this file.
 * @param {string} superclassImportSource  Module specifier the superclass was imported from.
 */
export function saveSuperclassImportSource(
  filename,
  className,
  superclassLocalName,
  superclassImportSource
) {
  if (filename && className && superclassLocalName && superclassImportSource) {
    superclassImportSources[filename + "\0" + superclassLocalName] =
      superclassImportSource;
    classSuperclassNames[filename + "\0" + className] = superclassLocalName;
  }
}

// can be called from visitor to access previously present declarations
export function getImportDeclaration(filename, typeName) {
  if (!filename || !typeName) {
    return null;
  }

  const typeNameParts = typeName.split(".");

  // find the declaration importing the typeName among the collected import declarations in this file
  const filteredDeclarations = importDeclarations[filename].filter(
    (importDeclaration) => {
      // each import declaration can import several entities, so let's check all of them
      for (let specifier of importDeclaration.specifiers) {
        if (
          (t.isImportDefaultSpecifier(specifier) ||
            t.isImportNamespaceSpecifier(specifier)) &&
          specifier.local.name === typeNameParts[0]
        ) {
          // if the import is default, then the typeName should only have one part (the import name)
          return true;
        } else if (
          t.isImportSpecifier(specifier) &&
          specifier.imported.name === typeNameParts[typeNameParts.length - 1]
        ) {
          // If the import is named, then the last part of the typeName should match the imported name
          return true;
        }
      }
    }
  );
  return filteredDeclarations[0]; // should be exactly one
}

/**
 * Try to resolve a module import source (as written in the source, e.g. "my/app/BaseController")
 * to the absolute filename key used in importDeclarations. Returns the key if a matching
 * file was already processed in this Babel run, or null otherwise.
 *
 * Handles:
 *  - Relative imports ("./BaseController", "../controllers/Base") — resolved from currentFilename's dir
 *  - Module-path imports ("my/app/BaseController") — resolved from sourceRoot
 *    When namespacePrefix is set (e.g. "my.app"), module-path imports are first tried with
 *    the prefix stripped (dots→slashes), so "my/app/BaseController" → "BaseController"
 *    is resolved as sourceRoot + "/BaseController" rather than sourceRoot + "/my/app/BaseController".
 *
 * Third-party / SAP module paths like "sap/ui/core/mvc/Controller" are never on disk
 * and will always return null (no key in importDeclarations).
 */
function resolveImportSourceToFilename(
  importSource,
  currentFilename,
  sourceRoot,
  namespacePrefix
) {
  if (!importSource || !currentFilename) return null;

  const extensions = [".js", ".ts", ".jsx", ".tsx", ".mjs"];

  const bases = [];
  if (importSource.startsWith("./") || importSource.startsWith("../")) {
    bases.push(Path.resolve(Path.dirname(currentFilename), importSource));
  } else if (sourceRoot) {
    bases.push(Path.resolve(sourceRoot, importSource));
    // When namespacePrefix is configured, module paths include the prefix as a leading
    // path segment. Strip it so "my/app/controller/Base" resolves to
    // sourceRoot/controller/Base instead of sourceRoot/my/app/controller/Base.
    if (namespacePrefix) {
      const prefixPath = namespacePrefix.replace(/\./g, "/");
      if (importSource.startsWith(prefixPath + "/")) {
        const stripped = importSource.slice(prefixPath.length + 1);
        bases.push(Path.resolve(sourceRoot, stripped));
      }
    }
  }

  for (const base of bases) {
    if (importDeclarations[base]) return base;
    for (const ext of extensions) {
      const candidate = base + ext;
      if (importDeclarations[candidate]) return candidate;
    }
  }
  return null;
}

/**
 * Walk the superclass import chain transitively to check whether any ancestor class
 * is imported from a path in knownPaths. Stops at maxDepth to avoid infinite loops.
 *
 * Ancestor files must have been seen by Babel's `pre` hook in this run (which happens
 * as soon as Babel opens the file, before any visitor traversal). File-processing order
 * therefore does not matter — classSuperclassNames is populated eagerly in saveImports.
 *
 * Example chain:
 *   MyController.js  extends BaseController  → import "my/app/BaseController"
 *   BaseController.js extends Controller     → import "sap/ui/core/mvc/Controller" ✓ known
 *
 * Called with:
 *   isSuperclassTransitivelyKnown("MyController.js", "BaseController", knownPaths, sourceRoot, namespacePrefix)
 * → returns true
 */
export function isSuperclassTransitivelyKnown(
  filename,
  superclassLocalName,
  knownPaths,
  sourceRoot,
  namespacePrefix = null,
  maxDepth = 3
) {
  if (
    !filename ||
    !superclassLocalName ||
    !knownPaths?.length ||
    maxDepth <= 0
  ) {
    return false;
  }

  const importDecl = getImportDeclaration(filename, superclassLocalName);
  if (!importDecl) return false;

  const importSource = importDecl.source.value;

  // Direct hit — immediate superclass is in the known list
  if (knownPaths.includes(importSource)) return true;

  // Try to resolve to a local file processed earlier in this Babel run
  const resolvedFile = resolveImportSourceToFilename(
    importSource,
    filename,
    sourceRoot,
    namespacePrefix
  );
  if (!resolvedFile) return false;

  // Look up what that file's class itself extends (stored by saveSuperclassImportSource).
  //
  // The descendant's local import name (superclassLocalName, e.g. "BaseController") equals
  // the class's own name in the ancestor file. classSuperclassNames[resolvedFile\0superclassLocalName]
  // gives the ancestor's superclass binding name in that file (e.g. "Controller"). This correctly
  // follows the exported class's chain rather than any sibling class's chain, fixing the bug where
  // a file with a local UI5 helper and a non-UI5 default export would wrongly match the helper.
  const ancestorSuperLocalName =
    classSuperclassNames[resolvedFile + "\0" + superclassLocalName];
  if (!ancestorSuperLocalName) return false;

  const ancestorSuperImportSource =
    superclassImportSources[resolvedFile + "\0" + ancestorSuperLocalName];
  if (!ancestorSuperImportSource) return false;

  if (knownPaths.includes(ancestorSuperImportSource)) return true;
  return isSuperclassTransitivelyKnown(
    resolvedFile,
    ancestorSuperLocalName,
    knownPaths,
    sourceRoot,
    namespacePrefix,
    maxDepth - 1
  );
}
