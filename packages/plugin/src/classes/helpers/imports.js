import { types as t } from "@babel/core";

let importDeclarations = {};

export const saveImports = (file) => {
  // save all import declarations before "unneeded" ones are removed by the TypeScript plugin
  importDeclarations[file.opts.filename] = file.ast.program.body.filter(
    t.isImportDeclaration
  ); // right now even the removed import still exists later and can be re-added. Otherwise do: .map(decl => t.cloneNode(decl));
};

// can be called from visitor to access previously present declarations
export function getImportDeclaration(filename, typeName) {
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
