import * as THREE from './three.module.js';
import * as INPUT from './input.js';

import { OrbitControls } from './OrbitControls.js';

class GameHandler {
    //debug
    get Camera() { return this.#camera; }

    //Privates
    #camera = new THREE.PerspectiveCamera(30, window.innerWidth / window.innerHeight, 1, 100000);
    #renderer = new THREE.WebGLRenderer({ antialias: true });
    #clock = new THREE.Clock();

    //publics
    Scene = new THREE.Scene();

    constructor() {
        this.InitialiseScene();
        this.Animate();
    }

    Animate() {
        requestAnimationFrame(() => this.Animate());

        let dt = this.#clock.getDelta();

        this.controls.update();

        this.material.uniforms["time"].value = .25 * this.#clock.elapsedTime;

        this.#renderer.render(this.Scene, this.#camera);
    }

    InitialiseScene() {
        window.addEventListener("resize", () => { this.Resize(); });
        window.addEventListener("keydown", INPUT.OnKeyDown);
        window.addEventListener("keyup", INPUT.OnKeyUp);

        document.body.appendChild(this.#renderer.domElement);

        this.material = new THREE.ShaderMaterial({
            uniforms: {
                tExplosion: {
                    type: "t",
                    value: new THREE.TextureLoader().load("./explosion.png")
                },
                time: { value: 0.0 }
            },
            vertexShader: $("#vertexShader")[0].text,
            fragmentShader: $("#fragmentShader")[0].text
        });
        this.material.transparent = true;
        let geometry = new THREE.IcosahedronGeometry(20, 8);
        let sphere = new THREE.Mesh(geometry, this.material);
        this.Scene.add(sphere);

        let geo = new THREE.BoxGeometry(8, 8, 8);
        let mat = new THREE.MeshPhongMaterial({ color: 0xffffff });
        let cube = new THREE.Mesh(geo, mat);
        cube.receiveShadows = true;
        cube.castShadows = true;
        this.Scene.add(cube);

        var ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
    	this.Scene.add(ambientLight);

        var light = new THREE.PointLight(0xffffff, 1.5, 18);
    	light.position.set(0,10,10);
    	light.castShadow = true;
    	// Will not light anything closer than 0.1 units or further than 25 units
    	light.shadow.camera.near = 0.1;
    	light.shadow.camera.far = 25;
    	this.Scene.add(light);

        // for (let i = 0; i < 50; i++) {
        //     for (let j = 0; j < 50; j++) {
        //         let sphere = new THREE.Mesh(geometry, this.material);
        //         sphere.rotation.x += 3.14 * Math.random();
        //         sphere.rotation.y += 3.14 * Math.random();
        //         sphere.rotation.z += 3.14 * Math.random();
        //         sphere.position.x = -500 + i * 100;
        //         sphere.position.z = -500 + j * 100;
        //         this.Scene.add(sphere);
        //     }
        // }


        this.#renderer.setSize(window.innerWidth, window.innerHeight);
        this.#renderer.setPixelRatio(window.devicePixelRatio);
        this.#renderer.shadowMap.enabled = true;

        this.#camera.position.set(0, 0, 100);
        this.controls = new OrbitControls(this.#camera, this.#renderer.domElement);
        this.controls.update();
    }

    //resizes the renderer to fit the screen
    Resize() {
        this.#renderer.setSize(window.innerWidth, window.innerHeight);
        this.#camera.aspect = window.innerWidth / window.innerHeight;
        this.#camera.updateProjectionMatrix();
    }
}

export default GameHandler;
