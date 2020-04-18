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

    //Privates
    #camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 1, 50000);
    #renderer = new THREE.WebGLRenderer({ antialias: true });
    #clock = new THREE.Clock();

    #assetPaths = [
        "../assets/SciFi_Fighter.FBX",
        "../assets/gattling_gun_test.fbx",
        "../assets/railgun_test_2.fbx"
    ]
    #meshes = {
        player: {
            ship: {},
            gattling_gun: {},
            rail_gun: {},
            plasma_gun: {}
        }
    };
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

    #scene = new THREE.Scene();

    constructor() {
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

        INPUT.UpdateKeyPressedOnce();

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

        //must be done AFTER all other main logic has run
        INPUT.FlushKeyPressedOnce();

        this.#renderer.render(this.#scene, this.#camera);
    }

    //public methods
    Initialise() {
        this.#mode = this.#modes.INITIALISING;

        let assets = [
            {
                path: this.#assetPaths[0],
                onComplete: obj => this.#meshes.player.ship = obj//this.AddPlayer(object)
            },
            {
                path: this.#assetPaths[1],
                onComplete: obj => this.#meshes.player.gattling_gun = obj
            },
            {
                path: this.#assetPaths[2],
                onComplete: obj => this.#meshes.player.rail_gun = obj
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

        document.body.appendChild(this.#renderer.domElement);

        this.AddPlayer();

        this.#player.SetupPointerLock();

        this.#gameObjects.forEach(g => { this.#scene.add(g.Object); });

        let light = new THREE.HemisphereLight( 0xffffbb, 0x080820, 10 );
        this.#scene.add(light);

        let gridHelper = new THREE.GridHelper(50000, 1000);
        this.#scene.add(gridHelper);

        let gridHelper2 = new THREE.GridHelper(50000, 1000);
        gridHelper2.translateY(25000);
        this.#scene.add(gridHelper2);

        this.#renderer.setPixelRatio(window.devicePixelRatio);
        this.#renderer.setSize(window.innerWidth, window.innerHeight);
        this.#renderer.shadowMap.enabled = true;
        //this.#renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }

    AddPlayer() {
        let playerMeshes = {
            ship: this.#meshes.player.ship.clone(),
            gattling_gun: this.#meshes.player.gattling_gun.clone(),
            rail_gun: this.#meshes.player.rail_gun.clone()
        };

        this.#player = new PlayerObject(playerMeshes, this.#camera);
        this.AddGameObject(this.#player);
    }

    AddGameObject(object) {
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

    get Scene() { return this.#scene; }

    get Player() { return this.#player; }

    get Renderer() { return this.#renderer; }
}

export default GameHandler;
