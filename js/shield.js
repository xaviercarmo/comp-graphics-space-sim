import * as THREE from '../libraries/three.module.js';

class Shield {
    #object;
    #uniforms;
    #active = true;

    constructor(parent, radius) {
        let uniforms = {
            tExplosion: {
                type: "t",
                value: window.GameHandler.AssetHandler.LoadedImages.sprites.shieldTexture
            },
            alphaMult: { value: 0 },
            time: { value: 0 }
        };
        let material = new THREE.ShaderMaterial({
            uniforms: uniforms,
            vertexShader: window.GameHandler.AssetHandler.LoadedShaders.vert.shield,
            fragmentShader: window.GameHandler.AssetHandler.LoadedShaders.frag.shield,
            transparent: true,
            depthWrite: false
        });
        let customMaskMaterial = new THREE.ShaderMaterial({
            uniforms: uniforms,
            vertexShader: window.GameHandler.AssetHandler.LoadedShaders.vert.shield,
            fragmentShader: window.GameHandler.AssetHandler.LoadedShaders.frag.shieldMasked,
            transparent: true,
            depthWrite: false
        });
        let geometry = new THREE.IcosahedronGeometry(radius, 3);
        // material = new THREE.MeshBasicMaterial({ color: "black", transparent: true, depthWrite: false, opacity: 1 });
        this.#object = new THREE.Mesh(geometry, material);
        this.#object.customMaskMaterial = customMaskMaterial;
        this.#object.layers.enable(window.GameHandler.RenderLayers.BLOOM_STATIC);
        parent.add(this.#object);

        this.#uniforms = material.uniforms;

        this.#object.rotation.set(-2.10, 0.71, 1.15);

        this.Test = this.#object;
    }

    Main(dt) {
        if (this.#active) {
            this.#uniforms.time.value = window.GameHandler.Clock.elapsedTime;
            this.#uniforms.alphaMult.value = THREE.Math.lerp(this.#uniforms.alphaMult.value, 0, 4 * dt);
        }
    }

    Activate() {
        this.#active = true;
    }

    Deactivate() {
        this.#active = false;
        this.#uniforms.alphaMult.value = 0;
    }

    Hit() {
        this.#uniforms.alphaMult.value = 1;
    }
}

export default Shield;