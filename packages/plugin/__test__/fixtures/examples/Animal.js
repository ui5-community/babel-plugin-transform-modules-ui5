import ManagedObject from "sap/ui/base/ManagedObject";

/**
 * @name examples.Animal
 */
export default class Animal extends ManagedObject {
  metadata = {
    properties: {
      type: { type: "string" },
      nickName: { type: "string" },
    },
  };

  constructor(...args) {
    super(...args);
  }

  init() {
    super.init();
  }

  callMe() {
    alert(`I"m a ${this.getType()}.
        Call me ${this.getNickName()}.`);
  }
}
