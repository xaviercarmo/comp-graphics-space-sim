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

        for (let i = 0; i < arraySize; i += 3) {
            //just randomising velocity for now, will be customisable later
            let vel = new THREE.Vector3(0, 0, Math.random() * 2);
            this.#particles.push(new Particle(this.#particleAgeLimit, new THREE.Vector3(), vel, this.#geometry.attributes, i));
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
        while (this.#spawnTimeCounter >= this.#spawnTimeInterval) {
            this.#lastParticleIndex = (this.#lastParticleIndex + 1) % this.#numParticles;
            this.#spawnTimeCounter -= this.#spawnTimeInterval;
        }
    }

    //public methods
    Main(dt) {
        this.#spawnParticles(dt);

        this.#particles.forEach(particle => {
            particle.Main(dt);

            if (particle.IsExpired) {
                this.#firstParticleIndex = particle.Index;
            }
        });
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

    _positionStore = new THREE.Vector3();

    constructor(ageLimit, origin, velocity, attributes, index) {
        this.Attributes = attributes;
        this.AgeLimit = ageLimit;
        this.Origin = origin;
        this.Position = origin;
        this.Velocity = velocity;
        this.Index = index;
        this.Alpha = 1; //initially its visible for now
    }

    Main(dt) {
        if (!this.IsExpired) {
            this.Position = _positionStore.add(this.Velocity.multiplyScalar(dt));
        }
        else {
           this.Position = this.Origin;
           this.Alpha = 0;
        }
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

        this.Attributes.position.array[this.Index] = position.x;
        this.Attributes.position.array[this.Index + 1] = position.y;
        this.Attributes.position.array[this.Index + 2] = position.z;

        this.Attributes.position.needsUpdate = true;
    }

    get IsExpired() {
        return this.Age > this.AgeLimit;
    }
}

export default ParticleSystem;