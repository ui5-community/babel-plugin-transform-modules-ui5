import ManagedObject from "sap/ui/base/ManagedObject";

export default class Animal extends ManagedObject {

    metadata = {
        properties: {
            type: { type: "string" },
            nickName: { type: "string" }
        }
    }

    constructor(...args) {
        super(...args);
    }

    init() {
        super.init();
    }

    callMe() {
        alert(`I'm a ${this.getType()}.
        Call me ${this.getNickName()}.`);
    }

}
