// Imports the default export of ActualBase under a different local name.
// The transitive walker must resolve the identifier-style default export binding
// and convert this class.
import Base from "./ActualBase";

class MyController extends Base {}
