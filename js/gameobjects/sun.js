import * as THREE from '../../libraries/three.module.js';
import GameObject from '../gameobject.js';

class SunObject extends GameObject {
    #material;
    #timeBank = 0;

    constructor() {
        let material = new THREE.ShaderMaterial({
            uniforms: {
                tSun: { value: window.GameHandler.AssetHandler.LoadedImages.sprites.sunTexture },
                time: { value: 0.0 }
            },
            vertexShader: window.GameHandler.AssetHandler.LoadedShaders.vert.sun,
            fragmentShader: window.GameHandler.AssetHandler.LoadedShaders.frag.sun
        });

        let geometry = new THREE.IcosahedronGeometry(8000, 5);
        let sphere = new THREE.Mesh(geometry, material);
        sphere.layers.enable(window.GameHandler.RenderLayers.BLOOM_STATIC);

        super(sphere);

        this.#material = material;
    }

    Main(dt) {
        this.#timeBank += dt;
        this.#material.uniforms.time.value = .004 * this.#timeBank;
    }
}

export default SunObject;