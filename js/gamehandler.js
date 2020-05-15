import * as THREE from '../libraries/three.module.js';
import * as INPUT from './input.js';
import * as UTILS from './utils.js';

import PreDownloader from './predownloader.js';
import GameObject from './gameobject.js';
import PlayerObject from './gameobjects/playerobject.js';
import ObstacleObject from './gameobjects/obstacleobject.js'
import PhysicsHandler from './physicshandler.js';


import { OrbitControls } from '../libraries/OrbitControls.js';

class GameHandler {
    //debug
    get Camera() { return this.#camera; }
    Orbit = false;
    //Privates
    #camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 1, 50000);
    #cameraGroup = new THREE.Group();
    #debugCamera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 1, 1000);
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
    #obstacle = {}; 

    #scene = new THREE.Scene();
    //publics

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

    #timeElapsed = 0;
    #totalTime = 1;
    #curveObject;
    #lookAt = new THREE.Vector3();
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
        
        

        //test obst spawn
        //console.log("ob pos", this.#obstacle[0].obstaclePosition);
        this.SpawnNewObstacles(); 
       
         

        // //camera movement testing
        // if (this.#timeElapsed == this.#totalTime) {
        //     //this.#timeElapsed = 0;
        // }
        // else {
        //     //this.#timeElapsed = Math.min(this.#timeElapsed + dt, this.#totalTime);
        //     this.#timeElapsed = THREE.MathUtils.lerp(this.#timeElapsed, this.#totalTime, (1 + this.#timeElapsed / this.#totalTime) * dt);
        //     this.#timeElapsed += 0.015 * dt;
        //     if (this.#timeElapsed / this.#totalTime > 0.9999) {
        //         this.#timeElapsed = this.#totalTime;
        //     }
        //     console.log(this.#timeElapsed / this.#totalTime);
        // }
        //
        // let progressPct = this.#timeElapsed / this.#totalTime;
        //
        // this.#lookAt.lerpVectors(new THREE.Vector3(0, 15.5, 15),  new THREE.Vector3(1, -3, 10), progressPct);
        // this.#debugCamera.lookAt(this.#lookAt);
        // //this.#debugCamera.lookAt(new THREE.Vector3(1, -3, 10));
        //
        // this.#curveObject.getPointAt(progressPct, this.#cameraGroup.position);

        //orbit controls for debugging
        //this.controls.update();

        //this.#renderer.render(this.#scene, this.#debugCamera);
        this.#renderer.render(this.#scene, this.#camera);
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
        //this.#scene.add(this.#cameraGroup);
        //this.#cameraGroup.add(this.#debugCamera);
        //let cameraHelper = new THREE.CameraHelper(this.#debugCamera);
        //this.#scene.add(cameraHelper);
        //this.#cameraGroup.position.set(0, 7.6, -31.9);
        //this.#debugCamera.lookAt(new THREE.Vector3(0, 15.5, 15));
        //cameraHelper.visible = true;

        this.#gameObjects.forEach(g => { this.#scene.add(g.Object); });

        let light = new THREE.HemisphereLight( 0xffffbb, 0x080820, 10 );
        this.#scene.add(light);

        let gridHelper = new THREE.GridHelper(50000, 1000);
        this.#scene.add(gridHelper);

        let gridHelper2 = new THREE.GridHelper(50000, 1000);
        gridHelper2.translateY(25000);
        this.#scene.add(gridHelper2);

        //spawn
        this.SpawnMultipleObstacles(1);
        this.GenerateRandomPoint();
        this.SpawnNewObstacles(); 

        this.#renderer.setPixelRatio(window.devicePixelRatio);
        this.#renderer.setSize(window.innerWidth, window.innerHeight);
        this.#renderer.shadowMap.enabled = true;
        //this.#renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        //orbit controls for debugging
        //this.#camera.position.set(2, -5, 15);
        //this.controls = new OrbitControls(this.#camera, this.#renderer.domElement);
        //this.controls.update();

        // var curve = new THREE.CatmullRomCurve3( [
        // 	new THREE.Vector3(0, 7.6, -31.9),
        // 	new THREE.Vector3( 15, 0, 0 ),
        //     new THREE.Vector3( 10, -3, 12 ),
        // 	new THREE.Vector3( 2, -5, 15 )
        // ] );
        //
        // var points = curve.getPoints( 100 );
        // var geometry = new THREE.BufferGeometry().setFromPoints( points );
        //
        // var material = new THREE.LineBasicMaterial( { color : 0xff0000 } );
        //
        // // Create the final object to add to the scene
        // var curveObject = new THREE.Line( geometry, material );
        // this.#curveObject = curve;
        //
        // this.#scene.add(curveObject);
    }

    AddPlayer(object) {
        this.#player = new PlayerObject(object, this.#camera);
        //this.#scene.add(this.#camera);
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

    SpawnMultipleObstacles(n){
        this.#obstacle = new Array(n);
        var num = n; 

        //set initial
        function Int(value){
            Math.trunc(value);
            return value; 
        }
        //generat n obstacles
        for (let i = 0; i < n; i++) {
            this.#obstacle[i] = new ObstacleObject(); 
        } 
    }

    GenerateRandomPoint(){
        var x = Math.random();
        var y = Math.random();
        var z = Math.random();
        var point = new THREE.Vector3(x, y, z);
        return point; 
    }

    SpawnNewObstacles(){
        let ranPoint = THREE.Vector3; 
        ranPoint = this.GenerateRandomPoint();
        //current player location
        let currX = this.#player.Object.position.x;
        let currY = this.#player.Object.position.y;
        let currZ = this.#player.Object.position.z; 

        //position total
        //as play moves more and more obstacles will spawn??
        var posX = 500;
        var posY = 500;
        var posZ = 500;
        var negX = -500;
        var negY = -500;
        var negZ = -500;
        console.log(this.#player.Object.position);

        if ((currX > posX || posY > posY || posZ > posZ) ||
            (currX < negX || currY < negY || currZ < negZ)) {
                

                let newObst = new ObstacleObject(); 
                newObst.obstacle.position.add(ranPoint);

        }
        //console.log(this.#player.Object.position);

        //console.log(ranPoint);
    }

    get Scene() { return this.#scene; }

    get Player() { return this.#player; }

    get Renderer() { return this.#renderer; }
}

export default GameHandler;
