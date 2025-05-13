const x = 1; // This should not be part of sap-ui-define

import { getElementPath } from "../../model/someFile";
import { createSchema } from "../schema/otherFile";

getElementPath(createSchema(), "elementSchema");
console.log(x);
