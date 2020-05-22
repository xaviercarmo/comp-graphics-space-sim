import * as THREE from '../libraries/three.module.js';

class Gun {
    _parent;
    _projectile;
    _projectileSpeed;
    _fireCounter = 0;
    _fireInterval;
    _projectileMaxAge; //can use this later to recycle projectile objects rather than remove them

    _projectiles = [];

    Firing = false;
    Direction = new THREE.Vector3(0, 0, 1);

    /**
     * Base class for guns
     * @param {THREE.Object3d} parent
     * Object3D that velocity is relative to. Must have a "Velocity" property. TODO make it so shooter vel added to proj vel.
     * @param {THREE.Object3D} projectile
     * Object3D to clone when spawning projectiles
     */
    constructor(parent, projectile, projectileSpeed, fireRate, projectileMaxAge) {
        this._parent = parent;
        this._projectile = projectile;
        this._projectileSpeed = projectileSpeed;
        this.FireRate = fireRate;
        this._projectileMaxAge = projectileMaxAge;
    }

    Main(dt) {
        let newProjectiles = [];

        if (this.Firing) {
            this._fireCounter += dt;

            while (this._fireCounter >= this._fireInterval) {
                newProjectiles.forEach(p => p.Main(this._fireInterval)); //may be necessayr

                let vel = this.Direction
                    .clone()
                    .transformDirection(this._parent.matrixWorld)
                    .multiplyScalar(this._projectileSpeed);

                let object = this._projectile.clone();
                this._parent.getWorldPosition(object.position);

                let projectile = new Projectile(object, vel, this._projectileMaxAge);

                newProjectiles.push(projectile);
                //this._projectiles.push(projectile);

                this._fireCounter -= this._fireInterval;
            }

            //maybe add leftover firecounter
            newProjectiles.forEach(p => p.Main(this._fireCounter));
        }

        for (let i = this._projectiles.length - 1; i >= 0; i--) {
            this._projectiles[i].Main(dt);
            if (this._projectiles[i].IsExpired) {
                this._projectiles[i].Dispose();
                this._projectiles.splice(i, 1);
            }
        }

        //console.log(newProjectiles.length);
        newProjectiles.forEach(p => this._projectiles.push(p));
    }

    /**
     * @param {number} value
     * Projectiles per second
     */
    set FireRate(value) {
        this._fireInterval = 1 / value;
    }
}

class Projectile {
    _object;
    _velocity;
    _age = 0;
    _maxAge;

    constructor(object, vel, maxAge) {
        window.GameHandler.Scene.add(object);
        this._object = object;
        this._velocity = vel;
        this._maxAge = maxAge;
    }

    Main(dt) {
        this._age += dt;
        this._object.position.add(this._velocity.clone().multiplyScalar(dt));
    }

    Dispose() {
        window.GameHandler.Scene.remove(this._object);
    }

    get IsExpired() {
        return this._age >= this._maxAge;
    }
}

export { Gun, Projectile };