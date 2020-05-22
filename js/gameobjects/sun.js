import * as THREE from '../../libraries/three.module.js';
import GameObject from '../gameobject.js';

class SunObject extends GameObject {
    #material;

    constructor() {
        let material = new THREE.ShaderMaterial({
            uniforms: {
                tSun: {
                    type: "t",
                    value: window.GameHandler.AssetHandler.LoadedImages.sprites.sunTexture
                },
                time: { value: 0.0 }
            },
            vertexShader: window.GameHandler.AssetHandler.LoadedShaders.vert.sun,
            fragmentShader: window.GameHandler.AssetHandler.LoadedShaders.frag.sun
        });

        let geometry = new THREE.IcosahedronGeometry(15_000, 5);
        let sphere = new THREE.Mesh(geometry, material);

        super(sphere);

        this.#material = material;
    }

    Main(dt) {
        this.#material.uniforms.time.value = .004 * window.GameHandler.Clock.elapsedTime;
    }

    MainNoPause(dt) { }
}

export default SunObject;