
import SAPClass from "sap/Class";

/**
 * @name MyClass
 */
class MyClass extends SAPClass {
    S: string = "S";
    private PS: string = "PS";
    private readonly PRS: string = "PRS";

    static SS: string = "SS";
    private static PSS: string = "PSS";
    private static readonly PSRS: string = "PSRS";

    // The following shouldn't be added as members
    X: any;
    private PX: any;
    private readonly PRX;

    static SX: string;
    private static PSX: any;
    private static readonly PSRX: any;
}
