import SAPClass from "sap/SAPClass";

/**
 * Reproduces the parsing scenario reported in issue #150:
 * `doctrine` would stop at the first malformed/unknown tag (e.g. an optional
 * `@param`) and silently skip everything after it, so the trailing `@alias`
 * was never seen and the class was not transpiled to `SAPClass.extend(...)`.
 *
 * With `comment-parser` the `@alias` is still discovered and the class is
 * converted normally.
 *
 * @param {string} [optional] an optional param that historically broke doctrine
 * @class
 * @alias x.y.AliasAfterTrickyParam
 */
export default class MyClass extends SAPClass {}
