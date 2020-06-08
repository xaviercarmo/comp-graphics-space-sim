import * as THREE from '../../libraries/three.module.js';
import { Gun, Projectile } from '../gun.js';

// each "projectile" has two models that spiral around the centre
class HelixGun extends Gun {
    _createProjectile(dt) {
        this._parent.rotation.z += 16 * dt;

        let vel = this.Direction
            .clone()
            .transformDirection(this._parent.matrixWorld)
            .multiplyScalar(this._projectileSpeed + this._speedRefParent.Speed);

        let object = new THREE.Group();
        object.add(this._projectile.clone());
        object.add(this._projectile.clone());
        object.add(this._projectile.clone());

        this._parent.getWorldPosition(object.position);
        this._parent.getWorldQuaternion(object.quaternion);

        return new HelixProjectile(this._speedRefParent, object, vel, this._projectileMaxAge);
    }
}

class HelixProjectile extends Projectile {
    #halfPi = Math.PI / 2;
    #rotAmplitude = Math.PI / 48;
    #verticalMovementScale = 0.8;
    #speedDivisionAmount = 2000;
    #speedDivided;
    #distanceTravelledDivided = 0;

    constructor(parent, object, vel, maxAge) {
        super(parent, object, vel, maxAge)

        this.#speedDivided = vel.length() / this.#speedDivisionAmount;
    }

    //this class assumes that the _object contains two forward-aligned projectiles
    _updatePosition(dt) {
        super._updatePosition(dt);

        this.#distanceTravelledDivided += this.#speedDivided;

        let obj1 = this._object.children[0];
        let obj2 = this._object.children[1];
        let obj3 = this._object.children[2];

        let pos = Math.sin(this.#distanceTravelledDivided) * 1.2;
        let rot = Math.sin(this.#distanceTravelledDivided - this.#halfPi) * this.#rotAmplitude * 1.2;
        let pos2 = Math.cos(this.#distanceTravelledDivided - this.#halfPi);
        let rot2 = Math.cos(this.#distanceTravelledDivided - Math.PI) * this.#rotAmplitude;

        obj1.position.x = -pos;
        obj1.rotation.y = rot;
        
        obj2.position.x = pos;
        obj2.rotation.y = -rot
        
        obj1.position.y = -pos2 * this.#verticalMovementScale;
        obj1.rotation.x = -rot2 * this.#verticalMovementScale;

        obj2.position.y = -pos2 * this.#verticalMovementScale;
        obj2.rotation.x = -rot2 * this.#verticalMovementScale;

        obj3.position.y = pos2;
        obj3.rotation.x = rot2;
    }
}

export default HelixGun;