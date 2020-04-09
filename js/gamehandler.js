import * as THREE from '../libraries/three.module.js';
import * as INPUT from './input.js';
import * as UTILS from './utils.js';

import PreDownloader from './predownloader.js';
import GameObject from './gameobject.js';
import PlayerObject from './gameobjects/playerobject.js';
import PhysicsHandler from './physicshandler.js';

import { OrbitControls } from '../libraries/OrbitControls.js';

class GameHandler {
    //debug
    get Camera() { return this.#camera; }
    Orbit = false;
    //Privates
    #camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 100000);
    #renderer = new THREE.WebGLRenderer({ antialias: true });
    #clock = new THREE.Clock();

    #assetPaths = [];

    #gameObjects = [];

    #modes = {
        NONE: 0,
        PRELOADING: 1,
        INITIALISING: 2,
        MAINMENU: 3,
        GAMERUNNING: 4,
        GAMEPAUSED: 5,
        GAMEOVER: 6
    }
    #mode = this.#modes.NONE;

    #player;

    //publics
    Scene = new THREE.Scene();

    constructor() {
        let assetNames = ["SciFi_Fighter.FBX"];
        assetNames.forEach((name) => { this.#assetPaths.push(`../assets/${name}`); });

        let gameHandler = this;
        this.#mode = this.#modes.PRELOADING;

        let preDownloader = new PreDownloader(this.#assetPaths, () => {
            $(".loading-text").text("Initialising game...");
            //Allows dom to re-render with initialising text
            setTimeout(() => {
                gameHandler.Initialise();
            }, 0);
        });
    }

    //private methods
    //NOTE: Due to current lack of support in Chrome for private instance methods we will use private fields that hold methods
    #animate = () => {
        //regardless of pausing, animation frames should continue for menu logic
        requestAnimationFrame(() => { this.#animate(); });

        //delta still needed for menu logic and so that physics doesn't jump ahead by a large delta after unpausing
        let dt = this.#clock.getDelta();

        //menu logic here
        //[...]

        //this.controls.update();

        //game logic only runs if game isn't paused
        this.#gameObjects.forEach(g => g.Main(dt));

        //this.#camera.position.copy(this.#gameObjects[0].Object.position);
        //this will be extracted to physics handler probably

        //later this will use the physics handler to run actual physics
        //for now it will just sum the player's forces and apply them
        this.#gameObjects.forEach(g => {
            /* NORMAL PHSICS
            let accelDt = g.Acceleration.multiplyScalar(dt);
            g.Velocity.add(accelDt);
            g.Object.translateOnAxis(g.Velocity.clone().normalize(), g.Velocity.clone().multiplyScalar(dt).length());

            g.PostPhysicsCallback(dt);
            */

            g.Object.translateZ(g.TESTSPEED * dt);
            g.PostPhysicsCallback(dt);
        });
        //end physics handler

        //this.controls.update();
        this.#renderer.render(this.Scene, this.#camera);
    }

    //public methods
    Initialise() {
        this.#mode = this.#modes.INITIALISING;

        const gameHandler = this;
        let assets = [
            {
                path: this.#assetPaths[0],
                onComplete: (object) => {
                    //object.position.y += 5;
                    //object.scale.multiplyScalar(0.7);
                    gameHandler.AddPlayer(object);
                }
            }
        ];

        UTILS.LoadAssets(assets, () => {
            $(".pre-downloader").remove();
            gameHandler.InitialiseScene();
            gameHandler.StartGameRunning();
        });
    }

    InitialiseScene() {
        window.addEventListener("resize", () => { this.Resize(); });
        window.addEventListener("keydown", INPUT.OnKeyDown);
        window.addEventListener("keyup", INPUT.OnKeyUp);

        document.body.appendChild(this.#renderer.domElement);
        this.#player.SetupPointerLock();

        this.#gameObjects.forEach(g => { this.Scene.add(g.Object); });

        let light = new THREE.HemisphereLight( 0xffffbb, 0x080820, 10 );
        this.Scene.add(light);

        let gridHelper = new THREE.GridHelper(50000, 1000);
        this.Scene.add(gridHelper);

        let gridHelper2 = new THREE.GridHelper(2500, 1000);
        gridHelper2.translateY(5000);
        this.Scene.add(gridHelper2);

        this.#renderer.setPixelRatio(window.devicePixelRatio);
        this.#renderer.setSize(window.innerWidth, window.innerHeight);
        this.#renderer.shadowMap.enabled = true;

        // this.#camera.position.set(0, 5.5, -21);
        // this.controls = new OrbitControls(this.#camera, this.#renderer.domElement);
        // this.controls.update();
    }

    AddPlayer(object) {
        this.#player = new PlayerObject(object, this.#camera);
        //for debug
        this.p = this.#player;
        this.AddObject(this.#player);
    }

    AddObject(object) {
        if (object instanceof GameObject) {

            this.#gameObjects.push(object);
        }
        else {
            console.log(`GameHandler rejected object: ${object} as it was not a GameObject`, object);
        }
    }

    StartGameRunning() {
        this.#mode = this.#modes.GAMERUNNING;
        this.#animate();
    }

    //resizes the renderer to fit the screen
    Resize() {
        this.#renderer.setSize(window.innerWidth, window.innerHeight);
        this.#camera.aspect = window.innerWidth / window.innerHeight;
        this.#camera.updateProjectionMatrix();
    }

    //toggles mode between running and paused. Will do nothing if mode is not currently one of the two.
    TogglePause() {
        if (this.#mode == this.#modes.GAMERUNNING) {
            this.#mode = this.#modes.GAMEPAUSED;
        }
        else if (this.#mode == this.#modes.GAMEPAUSED) {
            this.#mode = this.#modes.GAMERUNNING;
        }
        else {
            console.log("Cannot toggle pause, game is not currently running or paused.");
        }
    }

    //theirs
    CreateCameras() {
		const offset = new THREE.Vector3(0, 60, 0);
		const front = new THREE.Object3D();
		front.position.set(112, 100, 200);
		front.quaternion.set(0.07133122876303646, -0.17495722675648318, -0.006135162916936811, -0.9819695435118246);
		front.parent = this.player.object;
		const back = new THREE.Object3D();
		back.position.set(0, 100, -250);
		back.quaternion.set(-0.001079297317118498, -0.9994228131639347, -0.011748701462123836, -0.031856610911161515);
		back.parent = this.player.object;
		const wide = new THREE.Object3D();
		wide.position.set(178, 139, 465);
		wide.quaternion.set(0.07133122876303646, -0.17495722675648318, -0.006135162916936811, -0.9819695435118246);
		wide.parent = this.player.object;
		const overhead = new THREE.Object3D();
		overhead.position.set(0, 400, 0);
		overhead.quaternion.set(0.02806727427333993, 0.7629212874133846, 0.6456029820939627, 0.018977008134915086);
		overhead.parent = this.player.object;
		const collect = new THREE.Object3D();
		collect.position.set(40, 82, 94);
		collect.quaternion.set(0.07133122876303646, -0.17495722675648318, -0.006135162916936811, -0.9819695435118246);
		collect.parent = this.player.object;
		this.player.cameras = { front, back, wide, overhead, collect };
		this.activeCamera = this.player.cameras.back;
	}

    get Scene() { return this.Scene; }

    get Player() { return this.#player; }
}

export default GameHandler;
