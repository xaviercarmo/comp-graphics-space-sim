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
    #camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 1, 50000);
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

        //game logic only runs if game isn't paused
        this.#gameObjects.forEach(g => g.Main(dt));

        this.#gameObjects.forEach(g => {
            //physics logic here (later moved to physics handler probably)
            //[...]

            g.PostPhysicsCallback(dt);
        });

        //orbit controls for debugging
        //this.controls.update();

        this.#renderer.render(this.Scene, this.#camera);
    }

    //public methods
    Initialise() {
        this.#mode = this.#modes.INITIALISING;

        let assets = [
            {
                path: this.#assetPaths[0],
                onComplete: object => this.AddPlayer(object)
            }
        ];

        UTILS.LoadAssets(assets, () => {
            $(".pre-downloader").remove();
            this.InitialiseScene();
            this.StartGameRunning();
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

        let gridHelper2 = new THREE.GridHelper(50000, 1000);
        gridHelper2.translateY(25000);
        this.Scene.add(gridHelper2);

        this.#renderer.setPixelRatio(window.devicePixelRatio);
        this.#renderer.setSize(window.innerWidth, window.innerHeight);
        this.#renderer.shadowMap.enabled = true;
        //this.#renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        //orbit controls for debugging
        // this.#camera.position.set(0, 5.5, -21);
        // this.controls = new OrbitControls(this.#camera, this.#renderer.domElement);
        // this.controls.update();
    }

    AddPlayer(object) {
        this.#player = new PlayerObject(object, this.#camera);
        //this.Scene.add(this.#camera);
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

    get Scene() { return this.Scene; }

    get Player() { return this.#player; }
}

export default GameHandler;
