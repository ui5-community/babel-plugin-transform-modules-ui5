// Descendant inside sourceRoot (namespace "app"), extending a Base that lives in a
// directory which is a SIBLING of sourceRoot (".../-legacy"), not inside it.
//
// The N2 ancestor-namespace guard in shouldConvertClass must treat that sibling as
// OUTSIDE sourceRoot. Because the ancestor is outside, its namespace resolves to ""
// and it is not a controller file, so the ancestor would remain a native ES class —
// therefore this descendant must NOT be converted to Base.extend().
//
// Regression guard for the Path.relative containment fix: with the old
// startsWith(sourceRoot) check the sibling matched as "inside", the ancestor got a
// bogus non-empty namespace, and this class was wrongly converted.
import Base from "../../class-convert-transitive-sibling-sourceroot-legacy/Base";

export default class SiblingSourcerootApp extends Base {}
