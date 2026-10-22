// AChild sorts alphabetically before ZBase, so it is processed FIRST by the test runner.
// This fixture proves on-demand ancestor reading: when AChild is transformed, ZBase has
// not been opened by Babel yet, so its ancestry is not in the cache. resolveImportSourceToFilename
// reads ZBase.js from disk on demand, populates the caches, and the transitive walk succeeds.
import ZBase from "./ZBase";

export default class AChild extends ZBase {}
