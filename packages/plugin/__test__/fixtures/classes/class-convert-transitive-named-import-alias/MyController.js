// Imports BaseController under a different local alias (Base).
// Transitive detection must use the imported name ("BaseController") as the cache key
// in the ancestor file, not the local alias ("Base"), so MyController is correctly
// auto-converted.
import { BaseController as Base } from "./BaseController";

class MyController extends Base {}
