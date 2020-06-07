import * as THREE from '../../libraries/three.module.js'
import GameObject from '../gameobject.js';

class PhysicsObject extends GameObject {
    _mass = 0;
    _forces = {};

    _colliderRadius = 0;

    constructor(object) {
        super(object);
    }

    Main(dt) {
        super.Main(dt);
    }

    get BoundingSphere() {
        let centre = new THREE.Vector3();
        this._mainObject.getWorldPosition(centre);
        return {
            centre: centre,
            radius: this._colliderRadius
        };
    }

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