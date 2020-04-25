import * as THREE from '../libraries/three.module.js';

/**
 * Base class for handling a set of particles with the same texture/behaviour.
 * Handles recycling them in particular.
 */
class ParticleSystem {
    //privates
    _parent;

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
    constructor(parent, texture, particleAgeLimit, particlesPerSecond) {
        this._parent = parent;
        this._texture = texture;
        this._particleAgeLimit = particleAgeLimit;
        this._numParticles = Math.ceil(particleAgeLimit * particlesPerSecond); //rounds up in case of fractional pps
        this._numParticles += Math.ceil(this._numParticles * 0.5); //10% buffer for mistimings 
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
        //this._points.renderOrder = 9999;
        window.GameHandler.Scene.add(this._points);
    }

    _getMaterial() {
        let uniforms = {
            texture: { value: this._texture },
            pointSize: { value: 1.25 }
        };

        return new THREE.ShaderMaterial({
            uniforms: uniforms,
            vertexShader: document.getElementById( 'transparencyVertexShader' ).textContent,
            fragmentShader: document.getElementById( 'transparencyFragmentShader' ).textContent,
            blending: THREE.AdditiveBlending,
            transparent: true,
            depthWrite: false
        });
    }

    get Object() {
        return this._points;
    }
}

//for use by the particle systems only
class Particle {
    Age = 0;
    AgeLimit;
    Velocity;
    Attributes;
    Index;
    IsActive = false;

    PositionStore = new THREE.Vector3();

    constructor(colour, ageLimit, velocity, attributes, index) {
        this.Attributes = attributes;
        this.Index = index;

        this.Colour = colour;
        this.AgeLimit = ageLimit;
        this.Position = new THREE.Vector3();
        this.Velocity = velocity;

        this.Alpha = 0; //initially its invisible for now
    }

    Main(dt) {
        this.Age += dt;
        this.PositionStore.add(this.Velocity.clone().multiplyScalar(dt));
        this.Position = this.PositionStore;

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

    Activate(pos, vel) {
        this.Alpha = 1;
        this.Position = pos;
        this.Velocity = vel;
        this.IsActive = true;
    }

    Deactivate() {
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
        this.PositionStore.copy(position);

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