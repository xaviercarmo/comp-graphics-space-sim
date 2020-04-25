import * as THREE from '../libraries/three.module.js';

/**
 * Base class for handling a set of particles with the same texture/behaviour.
 * Handles recycling them in particular.
 */
class ParticleSystem {
    //privates
    _texture;

    _numParticles;
    _particleAgeLimit;
    _availableParticles = [];
    _activeParticles = [];

    _spawnTimeInterval;

    _geometry = new THREE.BufferGeometry();
    _points;
    _alphas;
    _positions;
    _colours;

    //publics

    //will need to take max num particles, particles per second, origin for spawn (or area for origin of spawn)
    constructor(texture, particleAgeLimit, particlesPerSecond) {
        this._texture = texture;
        this._particleAgeLimit = particleAgeLimit;
        this._numParticles = Math.ceil(particleAgeLimit * particlesPerSecond); //rounds up in case of fractional pps
        this._spawnTimeInterval = 1 / particlesPerSecond;

        this.#initialise();
    }

    //private methods
    #initialise = () => {
        let arraySize = this._numParticles * 3;
        this._alphas = new Float32Array(arraySize);
        this._positions = new Float32Array(arraySize);
        this._colours = new Uint8Array(arraySize);

        this._geometry.setAttribute('alpha', new THREE.BufferAttribute(this._alphas, 1));
        this._geometry.setAttribute('position', new THREE.BufferAttribute(this._positions, 3));
        this._geometry.setAttribute('color', new THREE.BufferAttribute(this._colours, 3, true));

        let material = this._getMaterial();

        this._points = new THREE.Points(this._geometry, material);
        window.GameHandler.Scene.add(this._points);
    }

    _getMaterial() {
        let uniforms = {
            texture: { value: this._texture }
        };

        return new THREE.ShaderMaterial({
            uniforms: uniforms,
            vertexShader: document.getElementById( 'transparencyVertexShader' ).textContent,
            fragmentShader: document.getElementById( 'transparencyFragmentShader' ).textContent,
            blending: THREE.AdditiveBlending,
            transparent: true,
            depthTest: false
        });
    }
}

//for use by the particle systems only
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

        this.Alpha = 0; //initially its invisible for now
    }

    Main(dt) {
        this.Age += dt;
        this.Position = this._positionStore.add(this.Velocity.clone().multiplyScalar(dt));

        // if (this.IsExpired) {
        //     this.Age = 0;
        //     this.Position = this.Origin;
        // }
        // else {
        //     //should try to make this discrete (like lerping) rather than just adding. this will prevent frame-rate dependency
        //     this.Position = this._positionStore.add(this.Velocity.clone().multiplyScalar(dt));
        //     //this.Alpha = 1 - this.Age / this.AgeLimit;
        // }
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

export { ParticleSystem, Particle };