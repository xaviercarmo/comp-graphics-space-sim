import * as THREE from '../../libraries/three.module.js'
import GameObject from '../gameobject.js';

class PhysicsObject extends GameObject {
    _mass = 0;
    _forces = {};

    // THESE ALL NEED TO BE MOVED INTO A PHYSICS-USER SUBCLASS THAT THE PLAYER CAN INHERIT FROM
    get Mass() { return this._mass; }

    get Acceleration() { return this.CalcNetForce().divideScalar(this._mass); }
    
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

export default PhysicsObject;