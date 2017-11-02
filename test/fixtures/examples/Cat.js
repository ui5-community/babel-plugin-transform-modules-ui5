import Animal from "./Animal";

/**
 * @name othernamespace.Cat
 */
export default class Cat extends Animal {

    init() {
        super.init();
        this.setType("Cat");
    }

    callMe() {
        super.callMe();
        alert("Miao~");
    }

    static createCat(nickName) {
        const cat = new example.obj.Cat({
            nickName
        });
        return cat;
    }

}
