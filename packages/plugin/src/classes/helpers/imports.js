import { types as t } from "@babel/core";
import * as Path from "path";

let importDeclarations = {};

// Maps filename → the import source path of that file's primary class's superclass.
// Populated by saveSuperclassImport() when visitor.js identifies a class that extends
// from an import. Used by isSuperclassTransitivelyKnown() for transitive chain walking.
let superclassImportSources = {};

export const saveImports = (file) => {
  // Clear any stale superclass entry so watch-mode rebuilds don't carry over
  // a previously recorded superclass that no longer applies to this file.
  delete superclassImportSources[file.opts.filename];
  // save all import declarations before "unneeded" ones are removed by the TypeScript plugin
  importDeclarations[file.opts.filename] = file.ast.program.body.filter(
    t.isImportDeclaration
  ); // right now even the removed import still exists later and can be re-added. Otherwise do: .map(decl => t.cloneNode(decl));
};

/**
 * Record the import source of a file's class superclass.
 * Called from the visitor when a class extending an import is encountered.
 * Used later for transitive resolution.
 */
export function saveSuperclassImportSource(filename, superclassImportSource) {
  if (filename && superclassImportSource) {
    superclassImportSources[filename] = superclassImportSource;
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
 *
 * Third-party / SAP module paths like "sap/ui/core/mvc/Controller" are never on disk
 * and will always return null (no key in importDeclarations).
 */
function resolveImportSourceToFilename(importSource, currentFilename, sourceRoot) {
  if (!importSource || !currentFilename) return null;

  const extensions = [".js", ".ts", ".jsx", ".tsx", ".mjs"];

  const bases = [];
  if (importSource.startsWith("./") || importSource.startsWith("../")) {
    bases.push(Path.resolve(Path.dirname(currentFilename), importSource));
  } else if (sourceRoot) {
    bases.push(Path.resolve(sourceRoot, importSource));
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
 * Requires that ancestor files were processed before the current file in this Babel run
 * AND that saveSuperclassImportSource() was called for each of them, which happens
 * automatically in visitor.js when a class extending an import is encountered.
 *
 * Example chain:
 *   MyController.js  extends BaseController  → import "my/app/BaseController"
 *   BaseController.js extends Controller     → import "sap/ui/core/mvc/Controller" ✓ known
 *
 * Called with:
 *   isSuperclassTransitivelyKnown("MyController.js", "BaseController", knownPaths, sourceRoot)
 * → returns true
 */
export function isSuperclassTransitivelyKnown(
  filename,
  superclassLocalName,
  knownPaths,
  sourceRoot,
  maxDepth = 3
) {
  if (!filename || !superclassLocalName || !knownPaths?.length || maxDepth <= 0) {
    return false;
  }

  const importDecl = getImportDeclaration(filename, superclassLocalName);
  if (!importDecl) return false;

  const importSource = importDecl.source.value;

  // Direct hit — immediate superclass is in the known list
  if (knownPaths.includes(importSource)) return true;

  // Try to resolve to a local file processed earlier in this Babel run
  const resolvedFile = resolveImportSourceToFilename(importSource, filename, sourceRoot);
  if (!resolvedFile) return false;

  // Look up what that file's class itself extends (stored by saveSuperclassImportSource)
  const ancestorSuperImportSource = superclassImportSources[resolvedFile];
  if (!ancestorSuperImportSource) return false;

  // Direct hit at one level up
  if (knownPaths.includes(ancestorSuperImportSource)) return true;

  // Recurse: find the local name the ancestor's superclass is imported as,
  // so we can walk further up
  const ancestorImports = importDeclarations[resolvedFile] || [];
  for (const decl of ancestorImports) {
    if (decl.source.value !== ancestorSuperImportSource) continue;
    for (const specifier of decl.specifiers) {
      if (
        t.isImportDefaultSpecifier(specifier) ||
        t.isImportNamespaceSpecifier(specifier)
      ) {
        return isSuperclassTransitivelyKnown(
          resolvedFile,
          specifier.local.name,
          knownPaths,
          sourceRoot,
          maxDepth - 1
        );
      }
    }
  }
  return false;
}
