import SAPClass from "sap/SAPClass";

/**
 * Mixes value tags (@alias) and bool flag tags (@nonUI5) — order should not
 * matter. With doctrine, sufficiently complex preceding tags could prevent
 * `@nonUI5` from being recognised. With comment-parser, every tag is seen.
 *
 * @param {object} [opts] - some optional thing
 * @param {string} [opts.label] - optional nested name with default
 * @alias x.y.ZNonUI5
 * @nonUI5
 */
export default class MyClass extends SAPClass {}
