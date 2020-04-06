//base class for all game objects
//all classes extending this one MUST define their own Main() method and
//MUST call super.Main() at the top of this method.
//They MUST also call super() at the top of their constructor.
class GameObject {
    _object;

    constructor(object) {
        this._object = object;
    }

    Main() {}

    get Object() { return this._object; }
}

export default GameObject;
