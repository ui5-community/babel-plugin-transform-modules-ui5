import Controller from "sap/ui/core/Controller";

export default class MyController extends Controller {
    constructor(arg) {
        console.log("before super");
        super(arg);
        console.log("after super");
        this.x = 1;
    }

    method(args) {
        super.init(...args);
        super.init?.(...args);
    }
}
