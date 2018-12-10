// export function create

// export function setInteropFlag(imports, opts) {
//   const { noImportInteropPrefixes = ['sap/'] } = opts
//   const noImportInteropPrefixesRegexp = new RegExp(noImportInteropPrefixes.map(p => `(^${p}.*)`).join('|'))
//   imports
//     .filter(imp => imp.default)
//     .forEach(imp => imp.interop = !noImportInteropPrefixesRegexp.test(imp.src))
// }
