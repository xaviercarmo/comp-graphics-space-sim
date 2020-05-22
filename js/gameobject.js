import * as THREE from '../libraries/three.module.js';

//base class for all game objects
//all classes extending this one MUST define their own Main() method and
//MUST call super.Main() at the top of this method.
//They MUST also call super() at the top of their constructor.
class GameObject {
    //privates
    _objectGroup = new THREE.Group();
    _mainObject;

    constructor(object) {
        this._objectGroup.add(object);
        this._mainObject = object;
    }

    /**
     * Main operations that will pause when game is paused
     * @param {number} dt 
     */
    Main(dt) {}

    /**
     * Main operations that should continue running when the game is paused
     * @param {number} dt
     */
    MainNoPause(dt) {}

    get Object() { return this._objectGroup; }

    get Position() { return this._objectGroup.position.clone(); }

    set Position(value) {
        if (value instanceof THREE.Vector3) {
            this._objectGroup.position.copy(value);
        }
        else {
            console.log("Cannot set position to something other than a vector3", value);
        }
    }
}

export default GameObject;
