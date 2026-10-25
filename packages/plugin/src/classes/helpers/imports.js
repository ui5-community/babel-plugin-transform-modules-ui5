import { types as t, parse } from "@babel/core";
import * as Path from "path";
import { readFileSync } from "fs";

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

// PM1: Per-file key index for O(1) cache invalidation.
// Maps filename → Set of keys currently stored in superclassImportSources and
// classSuperclassNames for that file. Allows clearFileFromCache to visit only
// the relevant keys rather than scanning all entries (which was O(N²) across N files).
// Using a Set gives O(1) dedup and membership checks vs. the prior Array.includes approach.
let ancestryCacheKeys = {};

// PM2: Tracks which files were populated by readAndRecordFile (on-demand disk reads)
// rather than by saveImports (Babel-opened files). On-demand entries are evicted once
// at the start of the first saveImports call in each rebuild cycle, so that a changed
// ancestor is re-read next time a descendant needs it rather than serving stale data.
// onDemandEvictedThisCycle prevents re-evicting the same set on every file in the cycle.
// It must be reset to false after each file (in post()) so the next watch cycle re-evicts.
const onDemandCachedFiles = new Set();
let onDemandEvictedThisCycle = false;

// N1: Tracks files that have any explicit `export default` declaration. Used to decide
// whether by-name fallback is safe in isSuperclassTransitivelyKnown for default imports:
// the fallback is only allowed when no default export exists (i.e. the class is consumed
// via module interop, and the import alias matches the class name). When a file HAS a
// default export, the "\0default" sentinel is authoritative — if it's absent, the default
// export has no convertible UI5 ancestry and the by-name fallback must not fire.
let filesWithDefaultExport = new Set();

// Tracks which additionalUI5Classes module paths were actually matched during this
// Babel run. Used by getUnmatchedAdditionalUI5Classes() to warn about misconfigured paths.
//
// Lifetime note: like allConfiguredUI5ClassPaths in index.js, this accumulates for the
// whole Node process. The unmatched-path warning fires once at process exit and reports
// the union across every build, so "configured" and "matched" are intentionally tracked
// on the same process-lifetime basis — they stay consistent with each other. A long-lived
// watch process never reaches process exit, so the warning is effectively a one-shot-CLI
// feature. resetAdditionalUI5ClassMatchTracking() is provided for programmatic callers and
// tests that drive multiple independent runs in one process and want a clean slate.
const matchedAdditionalUI5ClassPaths = new Set();

/**
 * Derive the full namespace string for `filename` given `sourceRoot` and plugin options.
 *
 * This is the pure, path-only version of the namespace computation — it does NOT append
 * the class name. Returns "" when the file has no namespace (e.g. unmapped sourceFolders
 * entry), and `undefined` when the file is outside both sourceRoot and all dependencies.
 *
 * Used by:
 *  - getFileBaseNamespace (classes.js) — production path via Babel path object
 *  - N2 ancestor-namespace check (visitor.js) — operates on resolved absolute paths
 *
 * @param {string} filename   Absolute path of the file.
 * @param {string} sourceRoot Absolute source-root path.
 * @param {object} opts       Plugin options (sourceFolders, namespacePrefix, dependencies).
 * @returns {string|undefined}  Namespace string (may be ""), or undefined when outside all roots.
 */
export function deriveNamespaceForFile(filename, sourceRoot, opts) {
  const filenameRelative = Path.relative(sourceRoot, filename);
  const insideSourceRoot =
    filenameRelative === "" ||
    (!filenameRelative.startsWith("..") && !Path.isAbsolute(filenameRelative));

  if (!insideSourceRoot) {
    const deps =
      opts && Array.isArray(opts.dependencies) ? opts.dependencies : [];
    for (const dep of deps) {
      if (!dep.sourceRoot) continue;
      const depRoot = Path.resolve(dep.sourceRoot);
      const depRel = Path.relative(depRoot, filename);
      const depInside =
        depRel === "" || (!depRel.startsWith("..") && !Path.isAbsolute(depRel));
      if (!depInside) continue;
      const sf = dep.sourceFolders;
      if (sf && typeof sf === "object") {
        const parts = Path.parse(depRel).dir.split(Path.sep);
        const leadingFolder = parts[0];
        if (
          leadingFolder &&
          Object.prototype.hasOwnProperty.call(sf, leadingFolder)
        ) {
          const mappedPrefix = sf[leadingFolder];
          const namespaceParts = parts.slice(1).filter(Boolean);
          if (mappedPrefix) namespaceParts.unshift(mappedPrefix);
          return namespaceParts.join(".");
        } else if (leadingFolder) {
          return "";
        }
        // File directly at dep root with no sub-folder — fall through to namespacePrefix
      }
      const depDirParts = Path.parse(depRel)
        .dir.split(Path.sep)
        .filter(Boolean);
      if (dep.namespacePrefix) depDirParts.unshift(dep.namespacePrefix);
      return depDirParts.join(".");
    }
    return undefined;
  }

  const sourceFolders = opts && opts.sourceFolders;
  const parts = Path.parse(filenameRelative).dir.split(Path.sep);
  const leadingFolder = parts[0];

  if (sourceFolders && typeof sourceFolders === "object") {
    if (
      leadingFolder &&
      Object.prototype.hasOwnProperty.call(sourceFolders, leadingFolder)
    ) {
      const mappedPrefix = sourceFolders[leadingFolder];
      const namespaceParts = parts.slice(1).filter(Boolean);
      if (mappedPrefix) namespaceParts.unshift(mappedPrefix);
      return namespaceParts.join(".");
    } else if (leadingFolder) {
      return "";
    }
    // File directly at sourceRoot with no sub-folder — fall through to namespacePrefix
  }

  const namespaceParts = parts.filter(Boolean);
  if (opts && opts.namespacePrefix)
    namespaceParts.unshift(opts.namespacePrefix);
  return namespaceParts.join(".");
}

/**
 * Resolve the effective namespace prefix for a given file path, respecting `sourceFolders`.
 *
 * When `opts.sourceFolders` (a `{ folderName: "prefix" }` map) is set:
 *   - The file's leading folder segment (relative to `sourceRoot`) is looked up in the map.
 *   - If matched, the mapped prefix is returned (may be an empty string).
 *   - If unmatched but a leading folder exists, `null` is returned (signals: no namespace).
 * Falls back to `opts.namespacePrefix` when `sourceFolders` is absent.
 *
 * @param {string} filename   Absolute path of the file.
 * @param {string} sourceRoot Absolute source-root path.
 * @param {object} opts       Plugin options (sourceFolders, namespacePrefix).
 * @returns {string|null}     The effective prefix string, "" for an empty-string mapping,
 *                            or null when the file's folder is present but unmapped.
 */
export function getEffectiveNamespacePrefix(filename, sourceRoot, opts) {
  const sourceFolders = opts && opts.sourceFolders;
  if (!sourceFolders || typeof sourceFolders !== "object") {
    return opts && opts.namespacePrefix != null ? opts.namespacePrefix : null;
  }
  const filenameRelative = Path.relative(sourceRoot, filename);
  const { dir } = Path.parse(filenameRelative);
  const parts = dir.split(Path.sep);
  const leadingFolder = parts[0];
  if (
    leadingFolder &&
    Object.prototype.hasOwnProperty.call(sourceFolders, leadingFolder)
  ) {
    return sourceFolders[leadingFolder]; // "" or a namespace string
  }
  if (leadingFolder) {
    // Present but not mapped in primary sourceFolders — check dependencies
    const deps = opts && opts.dependencies;
    if (Array.isArray(deps)) {
      for (const dep of deps) {
        if (!dep.sourceRoot) continue;
        const depRoot = Path.resolve(dep.sourceRoot);
        const depRel = Path.relative(depRoot, filename);
        const depInside =
          depRel === "" ||
          (!depRel.startsWith("..") && !Path.isAbsolute(depRel));
        if (!depInside) continue;
        const sf = dep.sourceFolders;
        if (sf && typeof sf === "object") {
          const { dir: depDir } = Path.parse(depRel);
          const depParts = depDir.split(Path.sep);
          const depLeading = depParts[0];
          if (
            depLeading &&
            Object.prototype.hasOwnProperty.call(sf, depLeading)
          ) {
            return sf[depLeading];
          }
          if (depLeading) {
            // File is inside this dep root but its leading folder is not mapped → no namespace
            return null;
          }
          // File directly at dep root — fall through to namespacePrefix
        }
        // No sourceFolders on this dep — use dep.namespacePrefix if provided.
        // If neither sourceFolders nor namespacePrefix is set on this dep entry,
        // null is returned and auto-conversion is suppressed for files in this dep.
        // Set dep.namespacePrefix to enable conversion for flat (non-folder-mapped) deps.
        return dep.namespacePrefix != null ? dep.namespacePrefix : null;
      }
    }
    // Present but not mapped → caller should treat as empty namespace
    return null;
  }
  // File is directly inside sourceRoot with no sub-folder — use namespacePrefix fallback
  return opts && opts.namespacePrefix != null ? opts.namespacePrefix : null;
}

/**
 * Record that `modulePath` (from additionalUI5Classes) was matched by an import in this run.
 */
export function recordAdditionalUI5ClassMatch(modulePath) {
  matchedAdditionalUI5ClassPaths.add(modulePath);
}

/**
 * Clear the matched-path tracking. Intended for programmatic/test callers that run
 * several independent transforms in a single process and need the next run's
 * unmatched-path check to start fresh. Not called during a normal CLI build (where
 * process-lifetime accumulation is the desired behaviour — see the note above).
 */
export function resetAdditionalUI5ClassMatchTracking() {
  matchedAdditionalUI5ClassPaths.clear();
}

/**
 * Return any paths from `additionalUI5Classes` that were never matched by an import
 * during this Babel run. Call once in the plugin's post hook per file; unmatched entries
 * that remain at the end of the run indicate a likely misconfiguration (e.g. a typo).
 */
export function getUnmatchedAdditionalUI5Classes(additionalUI5Classes) {
  if (!additionalUI5Classes?.length) return [];
  return additionalUI5Classes.filter(
    (path) => !matchedAdditionalUI5ClassPaths.has(path)
  );
}

/**
 * Populate the three ancestry caches for `filename` from a parsed program body.
 * Called from saveImports (eager path) and readAndRecordFile (on-demand path).
 */
function recordAncestry(filename, programBody) {
  // save all import declarations before "unneeded" ones are removed by the TypeScript plugin
  const imports = programBody.filter(t.isImportDeclaration);
  // right now even the removed import still exists later and can be re-added. Otherwise do: .map(decl => t.cloneNode(decl));
  importDeclarations[filename] = imports;

  // N1: Mark the file as having a default export unconditionally — before filtering
  // by class type or class name. This covers every form of `export default …`:
  // named classes, anonymous classes (`export default class {}`), function declarations,
  // expressions, and literals. Also covers `export { Foo as default }` (ExportNamedDeclaration
  // with a default-named specifier), which is NOT an ExportDefaultDeclaration.
  // The by-name fallback in isSuperclassTransitivelyKnown is suppressed whenever this file
  // is in filesWithDefaultExport.
  if (
    programBody.some(t.isExportDefaultDeclaration) ||
    programBody.some(
      (s) =>
        t.isExportNamedDeclaration(s) &&
        s.specifiers?.some(
          (sp) => t.isExportSpecifier(sp) && sp.exported.name === "default"
        )
    )
  ) {
    filesWithDefaultExport.add(filename);
  }

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

  // Maps className → superclassLocalName for classes defined in this file.
  // Used below to resolve identifier-style default exports to their superclass.
  const localClassSuperMap = new Map();

  for (const stmt of programBody) {
    // Handle: class Foo extends Bar {} and export default class Foo extends Bar {}
    // Also handle: export class Foo extends Bar {} (ExportNamedDeclaration wrapping a class).
    // ExportNamedDeclaration must be unwrapped here so that a subsequent identifier-style
    // `export default Foo` can find Foo in localClassSuperMap.
    const isDefaultExport =
      t.isExportDefaultDeclaration(stmt) &&
      t.isClassDeclaration(stmt.declaration);
    const isNamedExport =
      t.isExportNamedDeclaration(stmt) &&
      t.isClassDeclaration(stmt.declaration);
    const classNode = t.isClassDeclaration(stmt)
      ? stmt
      : isDefaultExport || isNamedExport
        ? stmt.declaration
        : null;
    if (!classNode) continue;
    const className = classNode.id?.name;
    const superName = classNode.superClass?.name;
    if (!className) continue;
    // N1: Record which classes are declared in this file, even if they have no imported
    // superclass, so localClassSuperMap contains every class name for the default-export pass.
    localClassSuperMap.set(className, superName || null);
    if (!superName) continue;
    const importSource = importBindings.get(superName);
    if (importSource) {
      const srcKey = filename + "\0" + superName;
      const clsKey = filename + "\0" + className;
      superclassImportSources[srcKey] = importSource;
      classSuperclassNames[clsKey] = superName;
      // PM1: track keys for O(1) invalidation
      ancestryCacheKeys[filename] = ancestryCacheKeys[filename] || new Set();
      ancestryCacheKeys[filename].add(srcKey);
      ancestryCacheKeys[filename].add(clsKey);
      // For inline `export default class Foo extends Bar {}`, record the sentinel
      // immediately. This will be overwritten below if an identifier-style default
      // export names a different class (identifier-style takes precedence).
      if (isDefaultExport) {
        const defKey = filename + "\0default";
        classSuperclassNames[defKey] = superName;
        ancestryCacheKeys[filename].add(defKey);
      }
    }
  }

  // PM3: handle identifier-style default exports: `export default ActualBase`.
  // These are a separate statement from the class declaration, so the loop above misses them.
  // Also fixes the sibling-collision issue: the sentinel must point to the class that is
  // actually exported as default, not to whichever inline export default class appeared last.
  // Also handles `export { Foo as default }` (ExportNamedDeclaration with a default specifier).
  for (const stmt of programBody) {
    let exportedName = null;
    if (
      t.isExportDefaultDeclaration(stmt) &&
      t.isIdentifier(stmt.declaration)
    ) {
      // `export default ActualBase`
      exportedName = stmt.declaration.name;
    } else if (t.isExportNamedDeclaration(stmt)) {
      // `export { Foo as default }` — specifier form
      for (const sp of stmt.specifiers ?? []) {
        if (t.isExportSpecifier(sp) && sp.exported.name === "default") {
          exportedName = sp.local.name;
          break;
        }
      }
    }
    if (!exportedName) continue;
    // N1: filesWithDefaultExport was already populated by the upfront scan above.
    const superName = localClassSuperMap.get(exportedName);
    // localClassSuperMap stores null for classes with no imported superclass (set above).
    // Only record the "\0default" sentinel when there IS a superclass to follow.
    if (superName) {
      const defKey = filename + "\0default";
      // Overwrite any sentinel from an inline export default class above.
      classSuperclassNames[defKey] = superName;
      // PM1: Set.add is idempotent — no need to guard against duplicates.
      ancestryCacheKeys[filename] = ancestryCacheKeys[filename] || new Set();
      ancestryCacheKeys[filename].add(defKey);
    }
  }
}

/**
 * Read `absPath` from disk, parse it minimally, and populate the ancestry caches.
 * Returns true if the file was read and recorded (or was already cached), false otherwise.
 * Degrades silently on missing or unparseable files — never throws.
 */
function readAndRecordFile(absPath) {
  if (Object.prototype.hasOwnProperty.call(importDeclarations, absPath))
    return true; // already cached
  try {
    const code = readFileSync(absPath, "utf8");
    // Don't enable JSX for plain .ts files: Babel's JSX parser treats the legacy
    // TypeScript type-assertion syntax `<SomeType>expr` as JSX and fails to parse it.
    // Only enable JSX for .jsx/.tsx files where it is expected.
    const isTS = /\.tsx?$/.test(absPath);
    const isJSX = /\.[jt]sx$/.test(absPath);
    const ast = parse(code, {
      sourceType: "module",
      babelrc: false,
      configFile: false,
      parserOpts: {
        errorRecovery: true,
        plugins: [
          ...(isTS ? ["typescript"] : []),
          ...(isJSX ? ["jsx"] : []),
          ["decorators", { legacy: true }],
          "classProperties",
        ],
      },
    });
    recordAncestry(absPath, ast.program.body);
    // PM2: mark as on-demand so saveImports evicts it on the next rebuild,
    // preventing a changed ancestor from serving stale cached data indefinitely.
    onDemandCachedFiles.add(absPath);
    return true;
  } catch (err) {
    if (err.code !== "ENOENT") {
      // Swallow ENOENT silently (file missing or deleted before the read).
      // Re-surface unexpected errors (permissions, parse failures, etc.).
      console.warn(
        `[babel-plugin-ui5] Could not read ancestor file ${absPath}: ${err.message}`
      );
    }
    return false; // unparseable or missing ancestor → degrade, never throw
  }
}

export const saveImports = (file, additionalUI5Classes) => {
  const filename = file.opts.filename;
  // PM2: evict all on-demand (disk-read) ancestor cache entries once per rebuild cycle.
  // Doing it once (guarded by onDemandEvictedThisCycle) rather than on every saveImports
  // call avoids re-reading every shared ancestor file once per source file per rebuild.
  // clearFileFromCache also removes the entry from onDemandCachedFiles, so a snapshot
  // of the keys is taken first to avoid mutating the Set while iterating it.
  if (!onDemandEvictedThisCycle) {
    onDemandEvictedThisCycle = true;
    for (const f of [...onDemandCachedFiles]) {
      clearFileFromCache(f);
    }
  }
  // Clear ALL stale cache entries for this file before re-populating, so watch-mode
  // rebuilds never carry over data from a previous version of the file.
  clearFileFromCache(filename);
  recordAncestry(filename, file.ast.program.body);
  // PM1: record matches for any import whose source is in additionalUI5Classes.
  // This runs unconditionally — before any class-conversion decision — so opt-outs like
  // autoConvertControllerClass:false don't suppress valid match recording and produce
  // false "never matched" warnings.
  if (additionalUI5Classes?.length) {
    const additionalSet = new Set(additionalUI5Classes);
    for (const decl of importDeclarations[filename] ?? []) {
      if (additionalSet.has(decl.source.value)) {
        recordAdditionalUI5ClassMatch(decl.source.value);
      }
    }
  }
};

/**
 * Reset all ancestry caches to their initial state.
 * Intended for programmatic/test callers that run several independent transforms
 * in a single process and need a completely clean slate between runs.
 * (The per-file `clearFileFromCache` is sufficient for watch-mode incremental eviction.)
 */
export function resetAllCaches() {
  importDeclarations = {};
  superclassImportSources = {};
  classSuperclassNames = {};
  ancestryCacheKeys = {};
  onDemandCachedFiles.clear();
  onDemandEvictedThisCycle = false;
  filesWithDefaultExport.clear();
  matchedAdditionalUI5ClassPaths.clear();
}

/**
 * Reset the per-cycle eviction flag after each file's post() hook.
 * This allows the next watch cycle's first saveImports call to re-evict on-demand
 * ancestor files that may have changed between builds.
 */
export function resetOnDemandEvictionCycle() {
  onDemandEvictedThisCycle = false;
}

/**
 * Remove all cache entries associated with `filename`.
 * Call this when a file is renamed or deleted mid-watch to prevent stale ancestry
 * data from persisting for the lifetime of the Babel process.
 */
export function clearFileFromCache(filename) {
  delete importDeclarations[filename];
  // PM1: use the per-file key index for O(own-keys) cleanup instead of scanning all entries.
  for (const key of ancestryCacheKeys[filename] ?? new Set()) {
    delete superclassImportSources[key];
    delete classSuperclassNames[key];
  }
  delete ancestryCacheKeys[filename];
  filesWithDefaultExport.delete(filename);
  onDemandCachedFiles.delete(filename);
}

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
    const srcKey = filename + "\0" + superclassLocalName;
    const clsKey = filename + "\0" + className;
    superclassImportSources[srcKey] = superclassImportSource;
    classSuperclassNames[clsKey] = superclassLocalName;
    // PM1: register keys so clearFileFromCache can find them without a full scan.
    // Set.add is idempotent, so no explicit membership check is needed.
    ancestryCacheKeys[filename] = ancestryCacheKeys[filename] || new Set();
    ancestryCacheKeys[filename].add(srcKey);
    ancestryCacheKeys[filename].add(clsKey);
  }
}

// can be called from visitor to access previously present declarations
export function getImportDeclaration(filename, typeName) {
  if (!filename || !typeName) {
    return null;
  }

  const typeNameParts = typeName.split(".");

  // find the declaration importing the typeName among the collected import declarations in this file
  const filteredDeclarations = (importDeclarations[filename] ?? []).filter(
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
          specifier.local.name === typeNameParts[typeNameParts.length - 1]
        ) {
          // Match on the local binding name (what the code actually uses).
          // For `import { Foo as Bar }`, local.name is "Bar" and imported.name is "Foo";
          // callers always pass the name as it appears in the source (the local name).
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
 * file was already processed in this Babel run or can be read from disk on demand, or null
 * otherwise.
 *
 * Handles:
 *  - Relative imports ("./BaseController", "../controllers/Base") — resolved from currentFilename's dir
 *  - Module-path imports ("my/app/BaseController") — resolved from sourceRoot
 *    When namespacePrefix is set (e.g. "my.app"), module-path imports are first tried with
 *    the prefix stripped (dots→slashes), so "my/app/BaseController" → "BaseController"
 *    is resolved as sourceRoot + "/BaseController" rather than sourceRoot + "/my/app/BaseController".
 *  - Module-path imports into dependency sourceRoots (e.g. "my/dep/base/DepBase") — resolved
 *    by walking each entry in `dependencies`, inverting its sourceFolders map, and trying
 *    both the raw path and the prefix-stripped path under each dep folder's root.
 *
 * Third-party / SAP module paths like "sap/ui/core/mvc/Controller" are never on disk
 * and will always return null (no key in importDeclarations, existsSync false).
 */
export function resolveImportSourceToFilename(
  importSource,
  currentFilename,
  { sourceRoot, namespacePrefix, sourceFolders, dependencies } = {}
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
    // When sourceFolders is configured (e.g. { "src": "my.app" }), each folder maps
    // module paths through its own prefix. Try both the raw path and the prefix-stripped
    // path under each folder's root so transitive resolution works without namespacePrefix.
    if (sourceFolders && typeof sourceFolders === "object") {
      for (const [folder, prefix] of Object.entries(sourceFolders)) {
        const folderRoot = Path.resolve(sourceRoot, folder);
        bases.push(Path.resolve(folderRoot, importSource));
        if (prefix) {
          const prefixPath = prefix.replace(/\./g, "/");
          if (importSource.startsWith(prefixPath + "/")) {
            const stripped = importSource.slice(prefixPath.length + 1);
            bases.push(Path.resolve(folderRoot, stripped));
          }
        }
      }
    }
    // Walk dependency sourceRoots: a module-path import like "my/dep/base/DepBase" may
    // refer to a file in a dep project whose folder is mapped to a prefix in dep.sourceFolders.
    // Invert each dep's sourceFolders map (prefix → folder) to strip the prefix and build
    // the candidate path under the dep's physical folder.
    if (Array.isArray(dependencies)) {
      for (const dep of dependencies) {
        if (!dep.sourceRoot) continue;
        const depRoot = Path.resolve(dep.sourceRoot);
        bases.push(Path.resolve(depRoot, importSource));
        if (dep.namespacePrefix) {
          const prefixPath = dep.namespacePrefix.replace(/\./g, "/");
          if (importSource.startsWith(prefixPath + "/")) {
            const stripped = importSource.slice(prefixPath.length + 1);
            bases.push(Path.resolve(depRoot, stripped));
          }
        }
        const depSf = dep.sourceFolders;
        if (depSf && typeof depSf === "object") {
          for (const [folder, prefix] of Object.entries(depSf)) {
            const folderRoot = Path.resolve(depRoot, folder);
            bases.push(Path.resolve(folderRoot, importSource));
            if (prefix) {
              const prefixPath = prefix.replace(/\./g, "/");
              if (importSource.startsWith(prefixPath + "/")) {
                const stripped = importSource.slice(prefixPath.length + 1);
                bases.push(Path.resolve(folderRoot, stripped));
              }
            }
          }
        }
      }
    }
  }

  const has = (p) =>
    Object.prototype.hasOwnProperty.call(importDeclarations, p);
  for (const base of bases) {
    if (has(base)) return base;
    for (const ext of extensions) {
      const candidate = base + ext;
      if (has(candidate)) return candidate;
    }
    for (const ext of extensions) {
      const candidate = base + "/index" + ext;
      if (has(candidate)) return candidate;
    }
  }
  // Nothing cached — try reading candidate files from disk on demand.
  // This makes transitive detection order-independent: a descendant processed before
  // its ancestor can still discover the ancestor's superclass chain via a disk read.
  // Bare module specifiers (e.g. "sap/ui/core/mvc/Controller") never reach here because
  // isSuperclassTransitivelyKnown checks knownPaths.has(importSource) first,
  // before resolveImportSourceToFilename is ever called.
  for (const base of bases) {
    // F1: try the exact path first — handles explicit-extension imports like "./Base.js"
    // where `base` is already the full resolved path and appending an extension would be wrong.
    if (readAndRecordFile(base)) return base;
    for (const ext of extensions) {
      const candidate = base + ext;
      if (readAndRecordFile(candidate)) return candidate;
    }
    // F2: directory index — handles `import Base from "./controllers"` → controllers/index.js
    for (const ext of extensions) {
      const candidate = base + "/index" + ext;
      if (readAndRecordFile(candidate)) return candidate;
    }
  }
  return null;
}

/**
 * Walk every intermediate local ancestor in the superclass chain and return false if any
 * would not itself be convertible to .extend() — i.e. has an empty namespace and is not
 * a .controller.(js|ts) file. Stops when a known SAP/UI5 path is reached.
 *
 * Fixes N2 for chains of depth > 1: a chain
 *   MyCtrl → LocalA (has namespace) → LocalMid (empty namespace) → SAP Controller
 * is rejected because LocalMid would remain a native ES class at runtime.
 *
 * @param {string}   startImportSource  Import source of the direct ancestor.
 * @param {string}   currentFile        Absolute path of the file being converted.
 * @param {string}   sourceRoot         Resolved absolute source root.
 * @param {string|null} namespacePrefix Effective namespace prefix for currentFile.
 * @param {Set<string>} knownPaths         SAP/UI5 known module paths (stop condition).
 * @param {object}   opts               Full plugin options.
 * @returns {boolean}  true if all intermediate locals are convertible, false otherwise.
 */
export function isLocalChainConvertible(
  startImportSource,
  currentFile,
  sourceRoot,
  namespacePrefix,
  knownPaths,
  opts
) {
  let importSource = startImportSource;
  let fromFile = currentFile;
  const visited = new Set();

  while (true) {
    if (knownPaths.has(importSource)) return true;

    const ancestorFile = resolveImportSourceToFilename(importSource, fromFile, {
      sourceRoot,
      namespacePrefix,
      sourceFolders: opts.sourceFolders ?? null,
      dependencies: opts.dependencies ?? null,
    });
    if (!ancestorFile) return true; // can't resolve → allow

    if (visited.has(ancestorFile)) return true;
    visited.add(ancestorFile);

    const ancestorNamespace = deriveNamespaceForFile(
      ancestorFile,
      sourceRoot,
      opts
    );
    const isControllerFile =
      opts.autoConvertUI5FileTypes !== false &&
      opts.autoConvertControllerClass !== false &&
      /[.]controller[.](js|ts)$/.test(Path.basename(ancestorFile));

    if (!ancestorNamespace && !isControllerFile) {
      return false;
    }

    // Find what this ancestor's exported class extends by looking in the cache.
    // Try "\0default" sentinel first. If the file has an explicit default export but no
    // sentinel, the default-exported class has no UI5 superclass — stop here (return true:
    // we cannot verify further, but the namespace check above already passed for this hop).
    // Only fall back to the key scan when the file has NO explicit default export at all
    // (bare class / module-interop), to avoid picking a sibling class's ancestry chain.
    // This mirrors the filesWithDefaultExport guard in isSuperclassTransitivelyKnown.
    const defSuperName = classSuperclassNames[ancestorFile + "\0default"];
    if (defSuperName) {
      const nextSrc =
        superclassImportSources[ancestorFile + "\0" + defSuperName];
      if (!nextSrc) return true;
      importSource = nextSrc;
      fromFile = ancestorFile;
      continue;
    }
    if (filesWithDefaultExport.has(ancestorFile)) return true;
    // No explicit default export — key-scan fallback is safe (interop / bare class declaration).
    let nextSrc = null;
    for (const key of ancestryCacheKeys[ancestorFile] ?? []) {
      const src = superclassImportSources[key];
      if (src !== undefined) {
        nextSrc = src;
        break;
      }
    }
    if (!nextSrc) return true;
    importSource = nextSrc;
    fromFile = ancestorFile;
  }
}

/**
 * Walk the superclass import chain transitively to check whether any ancestor class
 * is imported from a path in knownPaths. Cycle detection is handled by the `_visited`
 * Set (keyed by "filename\0superclassLocalName"), so circular inheritance chains never
 * cause infinite recursion.
 *
 * Ancestor files are populated via two paths:
 *  1. Eagerly, when Babel opens the file: the `pre` hook calls saveImports, which calls
 *     recordAncestry. This is the fast path; file-processing order doesn't matter here.
 *  2. On demand, when the ancestor hasn't been seen yet: resolveImportSourceToFilename
 *     tries to read and parse the ancestor file from disk (readAndRecordFile). This
 *     makes transitive detection fully order-independent.
 *
 * Example chain:
 *   MyController.js  extends BaseController  → import "my/app/BaseController"
 *   BaseController.js extends Controller     → import "sap/ui/core/mvc/Controller" ✓ known
 *
 * Called with:
 *   isSuperclassTransitivelyKnown("MyController.js", "BaseController", knownPaths, sourceRoot, opts)
 * → returns true
 *
 * @param {string}   filename            Absolute path of the file being checked.
 * @param {string}   superclassLocalName Local binding name of the superclass in `filename`.
 * @param {Set<string>} knownPaths          Module paths that count as "known UI5 base classes".
 * @param {string}   sourceRoot          Resolved absolute source root for the project.
 * @param {object}   opts                Plugin options subset: { namespacePrefix, sourceFolders, dependencies }.
 * @param {Set}      [_visited]          Internal cycle-detection set; callers omit this.
 */
export function isSuperclassTransitivelyKnown(
  filename,
  superclassLocalName,
  knownPaths,
  sourceRoot,
  opts = {},
  _visited = null
) {
  const {
    namespacePrefix = null,
    sourceFolders = null,
    dependencies = null,
  } = opts;
  if (!filename || !superclassLocalName || !knownPaths?.size) {
    return null;
  }

  const visited = _visited ?? new Set();
  const key = filename + "\0" + superclassLocalName;
  if (visited.has(key)) return null; // cycle detected
  visited.add(key);

  const importDecl = getImportDeclaration(filename, superclassLocalName);
  if (!importDecl) return null;

  const importSource = importDecl.source.value;

  // Direct hit — immediate superclass is in the known list; return the matched path
  if (knownPaths.has(importSource)) return importSource;

  // Try to resolve to a local file processed earlier in this Babel run
  const resolvedFile = resolveImportSourceToFilename(importSource, filename, {
    sourceRoot,
    namespacePrefix,
    sourceFolders,
    dependencies,
  });
  if (!resolvedFile) return null;

  // Look up what that file's class itself extends (stored by saveSuperclassImportSource).
  //
  // N1: For default imports the descendant's local alias (superclassLocalName) is irrelevant
  // to the ancestry stored in the resolved file — prefer the "\0default" sentinel, which
  // always points to the class actually exported as default. Only fall back to by-name lookup
  // when the ancestor file has NO explicit default export at all (bare class declaration
  // without any export default, consumed via module interop). When a file HAS an export
  // default the sentinel is authoritative: if it's absent, the exported class has no
  // convertible UI5 ancestry. This prevents a local sibling class sharing the import alias
  // from being matched instead of the actual default export (including the case where the
  // default-exported class has no superclass — which previously left no sentinel, causing
  // the by-name fallback to fire against the wrong sibling).
  // For named imports the by-name lookup is always correct.
  const isDefaultImport = importDecl.specifiers.some((s) =>
    t.isImportDefaultSpecifier(s)
  );
  let ancestorSuperLocalName;
  if (isDefaultImport) {
    // Prefer the "\0default" sentinel.
    // Fall back to by-name ONLY when no explicit default export exists (interop case).
    const hasSentinel = resolvedFile + "\0default" in classSuperclassNames;
    const hasDefaultExport = filesWithDefaultExport.has(resolvedFile);
    if (hasDefaultExport) {
      // File has an explicit default export — sentinel is authoritative.
      // If the sentinel is absent it means the default-exported class has no UI5 ancestry.
      ancestorSuperLocalName = classSuperclassNames[resolvedFile + "\0default"];
    } else {
      // No explicit default export — by-name fallback is safe (interop / bare class).
      ancestorSuperLocalName = hasSentinel
        ? classSuperclassNames[resolvedFile + "\0default"]
        : classSuperclassNames[resolvedFile + "\0" + superclassLocalName];
    }
  } else {
    // Named import: the class name in the ancestor file is the *imported* name, not the
    // local alias. For `import { Foo as Bar }`, the cache key was stored as "Foo" but
    // superclassLocalName is "Bar". Extract the imported name from the specifier.
    const namedSpecifier = importDecl.specifiers.find(
      (s) => t.isImportSpecifier(s) && s.local.name === superclassLocalName
    );
    const ancestorClassName =
      namedSpecifier?.imported?.name ?? superclassLocalName;
    ancestorSuperLocalName =
      classSuperclassNames[resolvedFile + "\0" + ancestorClassName];
  }
  if (!ancestorSuperLocalName) return null;

  const ancestorSuperImportSource =
    superclassImportSources[resolvedFile + "\0" + ancestorSuperLocalName];
  if (!ancestorSuperImportSource) return null;

  // One-hop hit: ancestor's superclass is directly known; return the matched path
  if (knownPaths.has(ancestorSuperImportSource))
    return ancestorSuperImportSource;
  return isSuperclassTransitivelyKnown(
    resolvedFile,
    ancestorSuperLocalName,
    knownPaths,
    sourceRoot,
    opts,
    visited
  );
}
