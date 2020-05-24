import * as THREE from '../../libraries/three.module.js';
import * as INPUT from '../input.js';
import * as UTILS from '../utils.js';

import { ParticleSystem, Particle } from '../particlesystem.js';

/**
 * For particle systems whose particles should not move with the parent object.
 * This has been tweaked to work with fast moving objects, but with extremely fast
 * objects (such as the player's ship) this will not work nicely as it outruns the
 * particles too quickly.
 */
class ThrusterParticleSystemGlobalPos extends ParticleSystem {
    #spawnTimeCounter = 0;
    #direction;
    #spread;
    #speed;
    #parentOldPos;

    /**
     * @param {THREE.Object3D} parent 
     * @param {THREE.Vector3} direction 
     * @param {THREE.Vector2} spread 
     * @param {number} speed 
     * @param {number} duration 
     */
    constructor(parent, direction, spread, speed, particleAgeLimit, particlesPerSecond) {
        super(parent, window.GameHandler.AssetHandler.LoadedImages.sprites.thrusterSprite, particleAgeLimit, particlesPerSecond, 1);
        
        this.#parentOldPos = this._parent.position.clone();
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
        
        let followPos = new THREE.Vector3();
        this._parent.getWorldPosition(followPos);

        let deltaTest = UTILS.SubVectors(followPos, this.#parentOldPos);
        let deltaParentPosLength = UTILS.SubVectors(followPos, this.#parentOldPos).length();

        let newDir = this.#direction.clone().transformDirection(this._parent.matrixWorld);

        let newVel = newDir.clone().multiplyScalar(this.#speed);

        while (this.#spawnTimeCounter >= this._spawnTimeInterval) {
            spawnedParticles.forEach(s => s.counter++);

            let activatedParticle = this._availableParticles.pop();
            if (activatedParticle != undefined) {
                // let followPos = new THREE.Vector3();
                // this._parent.getWorldPosition(followPos);
                
                //followPos.x += 1;
                //let newVel = this.#direction.clone();
                //newVel.transformDirection(this._parent.matrixWorld).multiplyScalar(this.#speed);
                activatedParticle.Activate(followPos, newVel);
                //activatedParticle.Colour = new THREE.Vector3(255 - 20 * spawnedParticles.length, 20 * spawnedParticles.length, 20 * spawnedParticles.length);

                spawnedParticles.push({ particle: activatedParticle, counter: 0 });
                this._activeParticles.push(activatedParticle);
            }
            else {
                console.log("ERROR: NOT ENOUGH PARTICLES FOR SYSTEM");
            }

            this.#spawnTimeCounter -= this._spawnTimeInterval;
        }

        if (spawnedParticles.length > 1) {
            let highestCounter = spawnedParticles[0].counter;
            let basePosition = followPos;
            let furthestPosition = UTILS.AddVectors(basePosition, deltaTest);
            let newPosition = new THREE.Vector3();

            for (let i = 0; i < spawnedParticles.length; i++) {
                let particle = spawnedParticles[i].particle;
                
                newPosition.lerpVectors(basePosition, furthestPosition, spawnedParticles[i].counter / highestCounter);
                
                // if (spawnedParticles[i].counter == 4) {
                //     newPosition.y += spawnedParticles[i].counter;
                // }
                // else {
                //     newPosition.y += 1000;
                // }
                particle.Position = newPosition;
            }
        }

        //only one of each counter anyway, just need to distribute each batch i guess
        // if (spawnedParticles.length > 1) {
        //     let particleCounts = [];

        //     for (let i = 0; i <= spawnedParticles[0].counter; i++) {
        //         particleCounts[i] = [];
        //     }

        //     for (let i = 0; i < spawnedParticles.length; i++) {
        //         particleCounts[spawnedParticles[i].counter].push(spawnedParticles[i].particle);
        //     }

        //     console.log(particleCounts);
        //     for (let i = 1; i < particleCounts.length; i++) {
        //         for (let j = 0; j < particleCounts[i].length; j++) {
        //             let particle = particleCounts[i][j];

        //         }
        //     }
        // }
        // if (spawnedParticles[0] != undefined) {
        //     var t = spawnedParticles[0].particle.PositionStore.clone();
        // }
        spawnedParticles.forEach(s => s.particle.Main(this._spawnTimeInterval * s.counter + this.#spawnTimeCounter)); //if timing bug comes back try enabling the spawned particles stuff
        // if (spawnedParticles[0] != undefined) {
        //     console.log(spawnedParticles[0].particle.PositionStore.z - t.z);
        // }
        // this.leTest = spawnedParticles;
    }

    Main(dt) {
        this.#spawnParticles(dt);

        for (let i = this._activeParticles.length - 1; i >= 0; i--) {
            let particle = this._activeParticles[i];
            if (particle.IsExpired) {
                //this.leTest.forEach(p => {if (p.particle == particle){console.log("well fuck me dead")}});
                particle.Deactivate();
                this._activeParticles.splice(i, 1);
                this._availableParticles.push(particle);
            }
            else {
                particle.Main(dt);
            }
        }
        
        this._geometry.computeBoundingSphere();

        this._parent.getWorldPosition(this.#parentOldPos);

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

/**
 * For particle systems whose particles should move with the parent object.
 */
class ThrusterParticleSystemLocalPos extends ParticleSystem {
    #spawnTimeCounter = 0;
    #velocity;
    #velSpread;
    #options;
    #speed = 0;

    Direction;

    /**
     * @param {THREE.Object3D} parent 
     * @param {THREE.Vector3} direction 
     * @param {THREE.Vector2} velSpread 
     * @param {number} duration
     * @param {object} extraOptions
     * {
     *     velSpread: THREE.Vector3,
     *     originSpread: THREE.Vector3,
     *     particleSize: Number
     * }
     */
    constructor(parent, direction, particleAgeLimit, particlesPerSecond, particleSize, extraOptions) {
        super(parent, window.GameHandler.AssetHandler.LoadedImages.sprites.thrusterSprite, particleAgeLimit, particlesPerSecond, particleSize);
        
        this._parent.add(this._points);

        this.Direction = direction;
        this.#velocity = new THREE.Vector3();

        this.#options = extraOptions ?? {};

        this.#initialise();
    }

    #initialise = () => {
        for (let i = 0; i < this._numParticles; i++) {
            //just randomising velocity for now, will be customisable later
            //let vel = new THREE.Vector3(Math.random() / 2 - 0.25, Math.random() / 2 - 0.25, 1).multiplyScalar(1);
            let particle = new ThrusterParticle(
                new THREE.Vector3(0, 150, 255),
                this._particleAgeLimit,
                new THREE.Vector3(),
                this._geometry.attributes,
                i
            );

            this._availableParticles.push(particle);
        }
    }

    #spawnParticles = (dt) => {
        if (this.Speed > 0) {
            let spawnedParticles = [];
            this.#spawnTimeCounter += dt;
            
            while (this.#spawnTimeCounter >= this._spawnTimeInterval) {
                spawnedParticles.forEach(s => s.counter++);
                
                let activatedParticle = this._availableParticles.pop();
                if (activatedParticle != undefined) {
                    let newVel = this.#velocity.clone();
                    let newPos = new THREE.Vector3();

                    if (this.#options.velSpread != undefined) {
                        newVel.x += UTILS.RandomFloatInRange(-this.#options.velSpread.x, this.#options.velSpread.x);
                        newVel.y += UTILS.RandomFloatInRange(-this.#options.velSpread.y, this.#options.velSpread.y);
                        newVel.z += UTILS.RandomFloatInRange(-this.#options.velSpread.z, this.#options.velSpread.z);
                    }

                    if (this.#options.originSpread != undefined) {
                        newPos.x += UTILS.RandomFloatInRange(-this.#options.originSpread.x, this.#options.originSpread.x);
                        newPos.y += UTILS.RandomFloatInRange(-this.#options.originSpread.y, this.#options.originSpread.y);
                        newPos.z += UTILS.RandomFloatInRange(-this.#options.originSpread.z, this.#options.originSpread.z);
                    }

                    //newVel.z += UTILS.RandomFloatInRange(-0.2, 0.2);
                    activatedParticle.Activate(newPos, newVel);

                    spawnedParticles.push({ particle: activatedParticle, counter: 0 });
                    this._activeParticles.push(activatedParticle);
                }
                else {
                    console.log("ERROR: NOT ENOUGH PARTICLES FOR SYSTEM");
                }
    
                this.#spawnTimeCounter -= this._spawnTimeInterval;
            }
    
            //smoothing
            spawnedParticles.forEach(s => s.particle.Main(this._spawnTimeInterval * s.counter + this.#spawnTimeCounter));
        }
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

    get Speed() {
        return this.#speed;
    }

    set Speed(value) {
        this.#speed = value;
        this.#velocity = this.Direction.clone().multiplyScalar(this.#speed);
    }
}

class ThrusterParticle extends Particle {
    Main(dt) {
        this.Age += dt;
        this.PositionStore.add(this.Velocity.clone().multiplyScalar(dt));
        this.Position = this.PositionStore;

        let agePct = this.Age / this.AgeLimit;

        this.Alpha = 1 - agePct;

        //smaller x/y length and smaller z = bluer
        //(0, 150, 255) at bluest
        //(100, 255, 255) at whitest
        //(255, 50, 0) at reddest
        //x = r, y = g, z = b
        let newColour = new THREE.Vector3();
        if (agePct < 0.25 && Math.abs(this.PositionStore.x) < 0.4) {
            newColour.x = 255 * agePct;
            newColour.y = 150 - 100 * agePct;
            newColour.z = 255 * (1 - agePct)
        }
        else {
            newColour.set(255, 50, 0);
        }

        this.Colour = newColour;

        //after 0.5 begin fading out
        // if (this.Age / this.AgeLimit >= 0.5) {
        //     this.Alpha = 1 - (this.Age - 0.5)/(this.AgeLimit - 0.5);
        // }
    }
}

export { ThrusterParticleSystemGlobalPos, ThrusterParticleSystemLocalPos }