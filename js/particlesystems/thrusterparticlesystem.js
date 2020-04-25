import * as THREE from '../../libraries/three.module.js';

import { ParticleSystem, Particle } from '../particlesystem.js';

class ThrusterParticleSystem extends ParticleSystem {
    #origin;

    #spawnTimeCounter = 0;
    #lastParticleIndex = 0;

    constructor(origin) {
        super(window.GameHandler.AssetHandler.LoadedImages.sprites.thrusterSprite, 1, 100);

        this.#origin = origin;

        this.#initialise();
    }

    #initialise = () => {
        for (let i = 0; i < this._numParticles; i++) {
            //just randomising velocity for now, will be customisable later
            let vel = new THREE.Vector3(Math.random() / 2 - 0.25, Math.random() / 2 - 0.25, 1).multiplyScalar(10);
            let particle = new ThrusterParticle(new THREE.Vector3(Math.random() * 255, Math.random() * 255, Math.random() * 255), this._particleAgeLimit, this.#origin, vel, this._geometry.attributes, i);
            this._availableParticles.push(particle);
        }
    }

    #spawnParticles = (dt) => {
        // let spawnedParticles = [];
        this.#spawnTimeCounter += dt;

        while (this.#spawnTimeCounter >= this._spawnTimeInterval) {
            //spawnedParticles.forEach(s => s.counter++);

            let activatedParticle = this._availableParticles.pop();
            if (activatedParticle != undefined) {
                activatedParticle.Activate();
                // spawnedParticles.push({ particle: activatedParticle, counter: 0 });
                this._activeParticles.push(activatedParticle);
            }

            this.#spawnTimeCounter -= this._spawnTimeInterval;
        }
        
        //spawnedParticles.forEach(s => s.particle.Main(this._spawnTimeInterval * s.counter)); //if timing bug comes back try enabling the spawned particles stuff
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
        this.Position = this._positionStore.add(this.Velocity.clone().multiplyScalar(dt));

        //after 0.5 begin fading out
        if (this.Age / this.AgeLimit >= 0.5) {
            this.Alpha = 1 - (this.Age - 0.5)/(this.AgeLimit - 0.5);
        }
    }
}

export default ThrusterParticleSystem;