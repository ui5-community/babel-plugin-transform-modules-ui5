// Cross-root transitive test: PrimaryExtendsDepBase.js is in the primary sourceRoot
// under src/app/. It extends DepBase (a relative import into dep-lib/src/base/),
// which itself extends sap/ui/core/mvc/Controller.
//
// Before the N2 fix, the ancestor (DepBase.js) was outside the primary sourceRoot so
// ancestorInsideSourceRoot was false → ancestorNamespace="" → N2 blocked conversion.
// After the fix, N2 walks opts.dependencies, finds dep-lib as the matching dep entry,
// computes ancestorNamespace="my.dep.base" (from dep.sourceFolders { src: "my.dep" }),
// and correctly allows conversion.
//
// Expected FQN: "my.app.app.PrimaryExtendsDepBase"

import DepBase from "../../../dep-lib/src/base/DepBase";

class PrimaryExtendsDepBase extends DepBase {}
