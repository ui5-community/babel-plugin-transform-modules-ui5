
// export function create

// export function setInteroptFlag(imports, opts) {
//   const { noImportInteroptPrefixes = ['sap/'] } = opts
//   const noImportInteroptPrefixesRegexp = new RegExp(noImportInteroptPrefixes.map(p => `(^${p}.*)`).join('|'))
//   imports
//     .filter(imp => imp.default)
//     .forEach(imp => imp.interop = !noImportInteroptPrefixesRegexp.test(imp.src))
// }
