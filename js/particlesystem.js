import * as THREE from '../libraries/three.module.js';
import * as UTILS from './utils.js';

/**
 * Class for handling a set of particles with the same texture/behaviour
 * handles recycling them
 */
class ParticleSystem {
    //privates
    #texture;

    #numParticles;
    #particleAgeLimit;
    #particles = [];

    #geometry = new THREE.BufferGeometry();
    #points;
    #alphas;
    #positions;
    #colours;

    //publics

    //will need to take max num particles, particles per second, origin for spawn (or area for origin of spawn)
    constructor(texture, particleAgeLimit, particlesPerSecond) {
        this.#texture = texture;
        this.#particleAgeLimit = particleAgeLimit;
        this.#numParticles = particleAgeLimit * particlesPerSecond;
        this.#spawnTimeInterval = 1 / particlesPerSecond;

        this.#initialise();
    }

    //private methods
    #initialise = () => {
        let arraySize = this.#numParticles * 3;
        this.#alphas = new Float32Array(arraySize);
        this.#positions = new Float32Array(arraySize);
        this.#colours = new Uint8Array(arraySize);

        this.#geometry.setAttribute('alpha', new THREE.BufferAttribute(this.#alphas, 1));
        this.#geometry.setAttribute('position', new THREE.BufferAttribute(this.#positions, 3));
        this.#geometry.setAttribute('color', new THREE.BufferAttribute(this.#colours, 3, true));

        for (let i = 0; i < this.#numParticles; i++) {
            //just randomising velocity for now, will be customisable later
            let vel = new THREE.Vector3(0, 0, 1);
            this.#particles.push(new Particle(new THREE.Vector3((i+1) / this.#numParticles * 255, 255, 255), this.#particleAgeLimit, new THREE.Vector3(), vel, this.#geometry.attributes, i));
        }

        let uniforms = {
            texture: { value: this.#texture }
        };

        let material = new THREE.ShaderMaterial({
            uniforms: uniforms,
            vertexShader: document.getElementById( 'transparencyVertexShader' ).textContent,
            fragmentShader: document.getElementById( 'transparencyFragmentShader' ).textContent,
            blending: THREE.AdditiveBlending,
            transparent: true,
            depthTest: false
        });

        this.#points = new THREE.Points(this.#geometry, material);
        window.GameHandler.Scene.add(this.#points);
    }

    #spawnTimeCounter = 0;
    #spawnTimeInterval = 0;
    #firstParticleIndex = 0;
    #lastParticleIndex = 0;
    #c = 0;
    #spawnParticles = (dt) => {
        this.#spawnTimeCounter += dt;

        while (this.#spawnTimeCounter >= this.#spawnTimeInterval && this.#lastParticleIndex < this.#numParticles) {
            // this.#lastParticleIndex = (this.#lastParticleIndex + 1) % this.#numParticles;
            // console.log(`Activated ${this.#particles[this.#lastParticleIndex].Index}`);
            // this.#particles[this.#lastParticleIndex].Activate();
            
            this.#particles[this.#lastParticleIndex].Activate();            
            
            this.#spawnTimeCounter -= this.#spawnTimeInterval;
            this.#lastParticleIndex++;
        }
    }

    #handleParticle = (particle, dt) => {
        if (particle.IsExpired) {
            console.log(`Deactivated ${particle.Index}`);
            particle.Deactivate();
            this.#firstParticleIndex = (this.#firstParticleIndex + 1) % this.#numParticles;
        }
        else {
            particle.Main(dt);
        }
    }

    //public methods
    Main(dt) {
        this.#spawnParticles(dt);
        //console.log(this.#lastParticleIndex - this.#firstParticleIndex);

        // if (this.#firstParticleIndex < this.#lastParticleIndex) {
        //     //process all vertices between them, exclude chunks outside
        //     for (let i = this.#firstParticleIndex; i <= this.#lastParticleIndex; i++) {
        //         let particle = this.#particles[i];
        //         this.#handleParticle(particle, dt);
        //     }
        // }
        // else {
        //     //exclude the chunk in between them
        //     for (let i = 0; i <= this.#lastParticleIndex; i++) {
        //         //process from zero up to the last unexpired particle
        //         let particle = this.#particles[i];
        //         this.#handleParticle(particle, dt);
        //     }
        //     for (let i = this.#firstParticleIndex; i < this.#numParticles; i++) {
        //         //process from first onwards
        //         let particle = this.#particles[i];
        //         this.#handleParticle(particle, dt);
        //     }
        // }

        this.#particles.forEach(particle => {
            if (particle.IsActive) {
                particle.Main(dt);
            }
        });

        this.#geometry.computeBoundingSphere();

        // this.#particles.forEach(particle => {
        //     particle.Main(dt);

        //     if (particle.IsExpired) {
        //         this.#firstParticleIndex = particle.Index;
        //     }
        // });


        //console.log(this.#particles);
    }
}

//for use by the particle system only - not publicly accessible
class Particle {
    Age = 0;
    AgeLimit;
    Origin;
    Velocity;
    Attributes;
    Index;
    IsActive = false;

    _positionStore = new THREE.Vector3();

    constructor(colour, ageLimit, origin, velocity, attributes, index) {
        this.Attributes = attributes;
        this.Index = index;

        this.Colour = colour;
        this.AgeLimit = ageLimit;
        this.Origin = origin;
        this.Position = origin;
        this.Velocity = velocity;
        this.Alpha = 0; //initially its visible for now
    }

    Main(dt) {
        this.Age += dt;

        if (this.IsExpired) {
            this.Age = 0;
            this.Position = this.Origin;
        }
        else {
            this.Position = this._positionStore.add(this.Velocity.clone().multiplyScalar(dt));
        }
    }

    Activate() {
        this.Alpha = 1;
        this.IsActive = true;
    }

    Deactivate() {
        this.Position = this.Origin;
        this.Age = 0;
        this.Alpha = 0;
        this.IsActive = false;
    }

    get Alpha() {
        return this.Attributes.alpha.array[this.Index];
    }

    /**
     * @param {number} alpha
     */
    set Alpha(alpha) {
        this.Attributes.alpha.array[this.Index] = alpha;

        this.Attributes.alpha.needsUpdate = true;
    }

    /**
     * @param {THREE.Vector3} position
     */
    set Position(position) {
        this._positionStore.copy(position);

        this.Attributes.position.array[this.Index * 3] = position.x;
        this.Attributes.position.array[this.Index * 3 + 1] = position.y;
        this.Attributes.position.array[this.Index * 3 + 2] = position.z;

        this.Attributes.position.needsUpdate = true;
    }

    set Colour(colour) {
        this.Attributes.color.array[this.Index * 3] = colour.x;
        this.Attributes.color.array[this.Index * 3 + 1] = colour.y;
        this.Attributes.color.array[this.Index * 3 + 2] = colour.z;

        this.Attributes.color.needsUpdate = true;
    }

    get IsExpired() {
        return this.Age >= this.AgeLimit;
    }
}

export default ParticleSystem;