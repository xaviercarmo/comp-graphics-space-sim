import * as THREE from '../libraries/three.module.js';
import * as UTILS from './utils.js';

class RockParticleCloud {
    #parent;

    #texture;
    // max radius of cloud
    #cloudRadius = 270;
    #cloudRadiusPadded = this.#cloudRadius * 0.99;
    #cloudRadiusFarZ = this.#cloudRadius * 0.95;
    // max radius of cloud, stored as a squared value for more
    // efficient length comparisons with the points
    #cloudRadiusSq = Math.pow(this.#cloudRadius, 2);

    #numParticles;
    #activeParticles = [];

    #geometry = new THREE.BufferGeometry();
    #points;
    #positions;

    Active = true;

    /**
     * @param {THREE.Object3D} parent
     * the object this cloud will spawn around
     * @param {THREE.Texture} texture
     * the sprite texture used for each particle
     * @param {number} maxParticles
     * the maximum number of particles active at any time
     */
    constructor(parent, texture, maxParticles) {
        this.#parent = parent;
        this.#texture = texture;
        this.#numParticles = maxParticles;

        this.#initialise();
    }

    #initialise = () => {
        this.#positions = new Float32Array(this.#numParticles * 3);
        this.#geometry.setAttribute('position', new THREE.BufferAttribute(this.#positions, 3));

        this.#points = new THREE.Points(this.#geometry, this.#getMaterial());

        window.GameHandler.Scene.add(this.#points);
        
        // create particles and spawn the initial cloud
        for (let i = 0; i < this.#numParticles; i++) {
            let particle = new RockParticle(this.#geometry.attributes, i);
            particle.Reset(this.#getRandomPos(false));
            this.#activeParticles.push(particle);
        }
    }

    #getMaterial = () => {
        let uniforms = {
            texture: { value: this.#texture },
            pointSize: { value: 1.5 }
        };

        return new THREE.ShaderMaterial({
            uniforms: uniforms,
            vertexShader: window.GameHandler.AssetHandler.LoadedShaders.vert.rockParticle,
            fragmentShader: window.GameHandler.AssetHandler.LoadedShaders.frag.rockParticle,
            blending: THREE.AdditiveBlending,
            transparent: true,
            depthWrite: false
        });
    }

    //generates a random point within the cloud, optionally restricted to the distant front
    #getRandomPos = (onlyFarZ) => {
        let minZ = onlyFarZ ? this.#cloudRadiusFarZ : -this.#cloudRadiusPadded;
        let pos = new THREE.Vector3(
            UTILS.RandomFloatInRange(-this.#cloudRadiusPadded, this.#cloudRadiusPadded),
            UTILS.RandomFloatInRange(-this.#cloudRadiusPadded, this.#cloudRadiusPadded),
            UTILS.RandomFloatInRange(minZ, this.#cloudRadiusPadded)
        );

        pos.clampLength(-this.#cloudRadiusPadded, this.#cloudRadiusPadded);

        return this.#parent.localToWorld(pos);
    }

    #isParticleOutsideCloud = (particle) => {
        let distanceSq = UTILS.SubVectors(this.#parent.position, particle.Position).lengthSq();
        return distanceSq > this.#cloudRadiusSq;
    }

    Main(dt) {
        for (let particle of this.#activeParticles) {
            if (this.#isParticleOutsideCloud(particle)) {
                particle.Reset(this.#getRandomPos(true));
            }
        }

        this.#geometry.computeBoundingSphere();
    }
}

class RockParticle {
    #positionStore = new THREE.Vector3();
    #attributes;
    #bufferIndex;

    constructor(attributes, bufferIndex) {
        this.#attributes = attributes;
        this.#bufferIndex = bufferIndex;

        this.Position = new THREE.Vector3();
    }

    // Activate(pos) {
    Reset(pos) {
        this.Position = pos;
    }

    get Position() {
        return this.#positionStore;
    }

    /**
     * @param {THREE.Vector3} position
     */
    set Position(position) {
        this.#positionStore.copy(position);

        this.#attributes.position.array[this.#bufferIndex * 3] = position.x;
        this.#attributes.position.array[this.#bufferIndex * 3 + 1] = position.y;
        this.#attributes.position.array[this.#bufferIndex * 3 + 2] = position.z;

        this.#attributes.position.needsUpdate = true;
    }
}

export default RockParticleCloud;