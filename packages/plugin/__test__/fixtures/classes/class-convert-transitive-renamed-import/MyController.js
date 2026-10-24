// Imports ActualBase under a different local alias (Base).
// Transitive detection must follow the default export's superclass chain,
// not the local binding name, so MyController is correctly auto-converted.
import Base from "./ActualBase";

class MyController extends Base {}
