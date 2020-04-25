import * as THREE from '../../libraries/three.module.js';
import * as INPUT from '../input.js';

import { ParticleSystem, Particle } from '../particlesystem.js';

class ThrusterParticleSystem extends ParticleSystem {
    #spawnTimeCounter = 0;
    #direction;
    #spread;
    #speed;

    /**
     * @param {THREE.Object3D} parent 
     * @param {THREE.Vector3} direction 
     * @param {THREE.Vector2} spread 
     * @param {number} speed 
     * @param {number} duration 
     */
    constructor(parent, direction, spread, speed, particleAgeLimit, particlesPerSecond) {
        super(parent, window.GameHandler.AssetHandler.LoadedImages.sprites.thrusterSprite, particleAgeLimit, particlesPerSecond);

        this.#direction = direction;
        this.#spread = spread;
        this.#speed = speed;

        this.#initialise();
    }

    #initialise = () => {
        for (let i = 0; i < this._numParticles; i++) {
            //just randomising velocity for now, will be customisable later
            //let vel = new THREE.Vector3(Math.random() / 2 - 0.25, Math.random() / 2 - 0.25, 1).multiplyScalar(1);
            let particle = new ThrusterParticle(
                new THREE.Vector3(255, 50, 0),
                this._particleAgeLimit,
                this._parent.position,
                new THREE.Vector3(),
                this._geometry.attributes,
                i
            );

            this._availableParticles.push(particle);
        }
    }

    #spawnParticles = (dt) => {
        let spawnedParticles = [];
        this.#spawnTimeCounter += dt;

        while (this.#spawnTimeCounter >= this._spawnTimeInterval) {
            spawnedParticles.forEach(s => s.counter++);

            let activatedParticle = this._availableParticles.pop();
            if (activatedParticle != undefined) {
                activatedParticle.Activate();
                let newVel = this.#direction.clone();
                newVel.transformDirection(this._parent.matrixWorld).multiplyScalar(this.#speed);
                activatedParticle.Velocity = newVel;

                spawnedParticles.push({ particle: activatedParticle, counter: 0 });
                this._activeParticles.push(activatedParticle);
            }
            else {
                console.log("ERROR: NOT ENOUGH PARTICLES FOR SYSTEM");
            }

            this.#spawnTimeCounter -= this._spawnTimeInterval;
        }
        
        spawnedParticles.forEach(s => s.particle.Main(this._spawnTimeInterval * s.counter + this.#spawnTimeCounter)); //if timing bug comes back try enabling the spawned particles stuff
    }

    Main(dt) {
        this.#spawnParticles(dt);

        for (let i = this._activeParticles.length - 1; i >= 0; i--) {
            let particle = this._activeParticles[i];
            if (particle.IsExpired) {
                particle.Deactivate();
                this._activeParticles.splice(i, 1);
                this._availableParticles.push(particle);
            }
            else {
                particle.Main(dt);
            }
        }
        
        this._geometry.computeBoundingSphere();

        // if (INPUT.KeyPressed("shift")) {
        //     if (INPUT.KeyPressed("w")) {
        //         this._points.position.z += -1 * dt;
        //     }
        //     if (INPUT.KeyPressed("a")) {
        //         this._points.position.x += -1 * dt;
        //     }
        //     if (INPUT.KeyPressed("s")) {
        //         this._points.position.z -= -1 * dt;
        //     }
        //     if (INPUT.KeyPressed("d")) {
        //         this._points.position.x -= -1 * dt;
        //     }
        //     if (INPUT.KeyPressed("r")) {
        //         this._points.position.y += 1 * dt;
        //     }
        //     if (INPUT.KeyPressed("f")) {
        //         this._points.position.y -= 1 * dt;
        //     }
        //     if (INPUT.KeyPressed("z")) {
        //         this._points.rotation.y += 1 * dt;
        //     }
        //     if (INPUT.KeyPressed("x")) {
        //         this._points.rotation.y -= 1 * dt;
        //     }
        // }
    }

    /**
     * @param {number} value
     */
    set Size(value) {
        //set size of particles
    }
}

class ThrusterParticle extends Particle {
    Main(dt) {
        this.Age += dt;
        this.Position = this.PositionStore.add(this.Velocity.clone().multiplyScalar(dt));

        this.Alpha = 1 - this.Age / this.AgeLimit;

        //after 0.5 begin fading out
        // if (this.Age / this.AgeLimit >= 0.5) {
        //     this.Alpha = 1 - (this.Age - 0.5)/(this.AgeLimit - 0.5);
        // }
    }
}

export default ThrusterParticleSystem;