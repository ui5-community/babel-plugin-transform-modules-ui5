// Regression guard: with noExportExtend enabled, a named export that cannot be
// collapsed onto the default export must raise the clear "Unsafe mixing of
// conflicting default and named exports" error that lists the offending names —
// NOT a garbled "Cannot read properties of undefined (reading 'map')" TypeError.
// (collapseNamedExports' early return must carry conflictingExports for the
// consumer's getPropNames() call.)
const def = { a: 1 };

export default def;

export const b = 2;
