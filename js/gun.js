import * as THREE from '../libraries/three.module.js';
import * as UTILS from './utils.js';
import PhysicsObject from './gameobjects/physics.js';

import { ThrusterParticleSystemLocalPos } from './particlesystems/thrusterparticlesystem.js';

/** TODO
 * ADD TRAILING PARTICLES TO THE BULLETS IT WILL BE SO COOL. SHOULD BE A VERY LONG, THIN TRAIL WITH SAME COLOUR AS PROJECTILE. SHOULD ONLY BE ACTIVE FOR ~1s BEFORE SWITCHING OFF
 * ALSO MAYBE A SPRITE THAT STRETCHES (SCALES) BACKWARDS ALONG THE DIRECTION OF TRAVEL
 */

class Gun {
    _parent;
    _speedRefParent;
    _projectile;
    _projectileSpeed;
    _timeSinceLastShot;
    _fireCounter = 0;
    _fireInterval;
    _projectileMaxAge; //can use this later to recycle projectile objects rather than remove them
    _damage; 

    Firing = false;
    Direction = new THREE.Vector3(0, 0, 1);

    /**
     * Base class for guns
     * @param {THREE.Object3d} parent
     * Object3D that orientation copies
     * @param {THREE.Object3D} projectile
     * Object3D to clone when spawning projectiles
     */
    constructor(parent, speedRefParent, projectile, projectileSpeed, fireRate, projectileMaxAge, damage) {
        this._parent = parent;
        this._speedRefParent = speedRefParent && speedRefParent.Speed != undefined
            ? speedRefParent
            : { Speed: 0 };
        this._projectile = projectile;
        this._projectileSpeed = projectileSpeed;
        this.FireRate = fireRate;
        this._projectileMaxAge = projectileMaxAge;
        this._timeSinceLastShot = this._fireInterval;
        this._damage = damage; 
    }

    #createProjectile = (dt) => {
        // projectiles only get created when firing, so this time gets invalidated
        this._timeSinceLastShot = 0;
        let projectile = this._createProjectile(dt);
        window.GameHandler.AddProjectile(projectile);
        return projectile;
    }

    //overrideable portion of create projectile
    _createProjectile(dt) {
        let vel = this.Direction
            .clone()
            .transformDirection(this._parent.matrixWorld)
            .multiplyScalar(this._projectileSpeed + this._speedRefParent.Speed);

        let object = this._projectile.clone();
        this._parent.getWorldPosition(object.position);
        this._parent.getWorldQuaternion(object.quaternion);

        return new Projectile(this._speedRefParent, object, vel, this._projectileMaxAge, this._damage);
    }

    Main(dt) {
        let newProjectiles = [];

        if (this.Firing) {
            // if enough time without firing has elapsed that a shot can be fired
            // instantly (i.e. gun's cooldown time has passed)
            if (this._timeSinceLastShot >= this._fireInterval) {
                // this shot should consume the firecounter
                this._fireCounter = 0;

                newProjectiles.push(this.#createProjectile(dt));
            }
            else {
                this._fireCounter += dt;

                while (this._fireCounter >= this._fireInterval) {
                    //could do thsi all at once rather than calling over and over (better for expensive projectiles)
                    newProjectiles.forEach(p => p.Main(this._fireInterval));
    
                    newProjectiles.push(this.#createProjectile(dt));
    
                    this._fireCounter -= this._fireInterval;
                }
    
                // add leftover firecounter
                newProjectiles.forEach(p => p.Main(this._fireCounter));

                // improvement: when multiple shots fired per frame, it looks ugly
                // because the above interpolation lines the shots in a straight line.
                // Can save the position of the first shot from the last batch, and for
                // sustained fire with sub-frame firerates interpolate the position of
                // spawned shots between the barrel and that last position. Should result
                // in clear streams. This is only necessary for EXTREMELY high fire rate
                // guns though, as even someone running the game at 30fps would need a
                // weapon firing >30 shots per second for this change to be noticeable
            }
        }
        else {
            this._timeSinceLastShot += dt;
        }
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
    _parent;
    _object;
    _velocity;
    _age = 0;
    _maxAge;
    _damage; 

    #oldPos = new THREE.Vector3();

    #testing;

    constructor(parent, object, vel, maxAge, damage) {
        this._parent = parent;

        window.GameHandler.Scene.add(object);
        this._object = object;
        this._velocity = vel;
        this._maxAge = maxAge;
        this._damage = damage; 

        // let extraOptionsLight = {
        //     velSpread: new THREE.Vector3(0.5, 0.5, 0),
        //     originSpread: new THREE.Vector3(0.1, 0.1, 0)
        // };
        // this.#testing = new ThrusterParticleSystemLocalPos(
        //     this._object,
        //     new THREE.Vector3(0, 0, -1),
        //     0.15,
        //     1000,
        //     1.25,
        //     extraOptionsLight
        // );
        // this.#testing.Speed = 600;
    }

    _updatePosition(dt) {
        this._object.position.add(this._velocity.clone().multiplyScalar(dt));
    }

    _checkForCollisions() {
        for (let object of window.GameHandler.GameObjects) {
            let sphere = object.BoundingSphere;
            if (object != this._parent && object.IsPhysicsObject && UTILS.RayIntersectsSphere(this.#oldPos, this._object.position, sphere)) {
                // on a path towards or away from the enemy object, now just need to detect if moving crossed over the object
                let oldDelta = UTILS.SubVectors(sphere.centre, this.#oldPos);
                let currDelta = UTILS.SubVectors(sphere.centre, this._object.position);

                if (Math.sign(oldDelta.x) != Math.sign(currDelta.x) || Math.sign(oldDelta.y) != Math.sign(currDelta.y) || Math.sign(oldDelta.z) != Math.sign(currDelta.z)) {
                    object.HitByBullet?.(this._damage);
                    this.Dispose();
                    break;
                }
            }
        }
    }

    Main(dt) {
        this._age += dt;

        if (!this.IsExpired) {
            this.#oldPos.copy(this._object.position);
            this._updatePosition(dt);

            this._checkForCollisions();

            // this.#testing.Main(dt);
        }
        else {
            this.Dispose();
        }
    }

    Dispose() {
        this._age = this._maxAge;
        window.GameHandler.Scene.remove(this._object);
    }

    get IsExpired() {
        return this._age >= this._maxAge;
    }
    
    get Position() {
        return this._object.position.clone();
    }
}

export { Gun, Projectile };