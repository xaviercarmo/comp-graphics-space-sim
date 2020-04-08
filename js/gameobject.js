import * as THREE from '../libraries/three.module.js';
import * as UTILS from './utils.js';

//base class for all game objects
//all classes extending this one MUST define their own Main() method and
//MUST call super.Main() at the top of this method.
//They MUST also call super() at the top of their constructor.
class GameObject {
    //privates
    _objectGroup = new THREE.Group();
    _mainObject;

    //physics
    _mass = 0;
    _forces = {};

    //publics
    Velocity = new THREE.Vector3();

    constructor(object) {
        this._objectGroup.add(object);
        this._mainObject = object;
    }

    Main(dt) {}

    get Object() { return this._objectGroup; }

    get Mass() { return this._mass; }

    get Acceleration() { return this.CalcNetForce().divideScalar(this._mass); }

    get Position() { return this._objectGroup.position.clone(); }

    set Position(value) {
        if (value instanceof THREE.Vector3) {
            this._objectGroup.position.copy(value);
        }
        else {
            console.log("Cannot set position to something other than a vector3", value);
        }
    }

    ApplyForce(force) {
        this._forces[force.name] = force.vector;
    }

    FlushForces() {
        this._forces = {};
    }

    CalcNetForce() {
        //all forces start from the origin, they are 3-element vectors
        //so they represent both direction and magnitude. Adding
        //these vectors together produces a net direction and magnitude
        let result = new THREE.Vector3();
        for (const forceName in this._forces) {
            result.add(this._forces[forceName]);
        }

        return result;
    }

    PostPhysicsCallback(dt) {}
}

export default GameObject;
