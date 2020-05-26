import * as THREE from '../libraries/three.module.js';
import * as INPUT from './input.js';
import * as UTILS from './utils.js';

import AssetHandler from './assethandler.js';
import GameObject from './gameobject.js';
import PhysicsObject from './gameobjects/physics.js';
import PlayerObject from './gameobjects/physicsobjects/player.js';
import SunObject from './gameobjects/sun.js';

import { EffectComposer } from '../libraries/EffectComposer.js';

class GameHandler {
    //debug
    get Camera() { return this.#camera; }

    //privates
    #camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 1, 100_000);
    #renderer = new THREE.WebGLRenderer({ antialias: true });
    #clock = new THREE.Clock();

    #gameObjects = [];

    #modes = {
        NONE: 0,
        PRELOADING: 1,
        INITIALISING: 2,
        MAINMENU: 3,
        GAMERUNNING: 4,
        GAMEPAUSED: 5,
        GAMEOVER: 6
    };
    #mode = this.#modes.NONE;

    #player;
    #sun;

    #scene = new THREE.Scene();

    //publics
    AssetHandler = new AssetHandler();

    //public so that other classes can assign themselves to a layer
    RenderLayers = {
        BASE: 0,
        BLOOM: 1
    };

    constructor() {
        this.#mode = this.#modes.PRELOADING;
        this.AssetHandler.LoadAllAssets(() => this.#initialise.call(this));
    }

    //private methods
    //NOTE: Due to current lack of support in Chrome for private instance methods we will use private fields that hold methods
    #initialise = () => {
        this.#mode = this.#modes.INITIALISING;
        
        //later can extend this to animate the cursor
        $("body").css({ "cursor": "url(assets/cursors/scifi.png), auto" });
        this.#initialiseScene();
        this.#startGameRunning();
        window.setTimeout(() => $(".pre-downloader").remove(), 1000);
    }

    #initialiseScene = () => {
        this.#initialiseRenderer();

        this.#initialisePlayer();

        let gridHelper = new THREE.GridHelper(5000, 100);
        this.#scene.add(gridHelper);

        this.#initialiseSkyBox();

        this.#initialiseSun();

        this.#setupMenuEvents();

        this.#initialiseGameObjects();
    }

    #initialiseRenderer = () => {
        window.addEventListener("resize", () => { this.Resize(); });
        
        document.addEventListener("visibilitychange", () => {
            if (document.hidden) {
                this.Pause();
            }
        }, false)

        document.body.appendChild(this.#renderer.domElement);

        this.#renderer.setPixelRatio(window.devicePixelRatio);
        this.#renderer.setSize(window.innerWidth, window.innerHeight);
        this.#renderer.shadowMap.enabled = true;
    }

    #initialisePlayer = () => {
        let playerMeshes = {
            ship: this.AssetHandler.LoadedAssets.ship.clone(),
            gattling_gun: this.AssetHandler.LoadedAssets.gattling_gun.clone(),
            rail_gun: this.AssetHandler.LoadedAssets.rail_gun.clone(),
            gattling_gun_new: {
                base_plate: this.AssetHandler.LoadedAssets.gattling_gun_base_plate.clone(),
                struts: this.AssetHandler.LoadedAssets.gattling_gun_struts.clone(),
                barrel: this.AssetHandler.LoadedAssets.gattling_gun_barrel.clone()
            }
        };

        this.#player = new PlayerObject(playerMeshes, this.#camera);
        this.AddGameObject(this.#player);

        this.#player.SetupPointerLock();
    }

    #initialiseSkyBox = () => {
        let skyMapTextures = this.AssetHandler.LoadedImages.skymap;
        let matParams = { side: THREE.BackSide, depthWrite: false };
        let materials = [
            new THREE.MeshBasicMaterial({ map: skyMapTextures.rt, ...matParams }),
            new THREE.MeshBasicMaterial({ map: skyMapTextures.lt, ...matParams }),
            new THREE.MeshBasicMaterial({ map: skyMapTextures.tp, ...matParams }),
            new THREE.MeshBasicMaterial({ map: skyMapTextures.bm, ...matParams }),
            new THREE.MeshBasicMaterial({ map: skyMapTextures.ft, ...matParams }),
            new THREE.MeshBasicMaterial({ map: skyMapTextures.bk, ...matParams }),
        ];

        let skyBoxGeo = new THREE.BoxGeometry(100_000, 100_000, 100_000);
        let skyBox = new THREE.Mesh(skyBoxGeo, materials);
        this.Scene.add(skyBox);
        skyBox.visible = true;

        this.SkyBox = skyBox;
    }

    #initialiseSun = () => {
        this.#sun = new SunObject();
        this.AddGameObject(this.#sun);

        this.SkyBox.add(this.#sun.Object);
        this.#sun.Position = new THREE.Vector3(0, 0, 49_000);
        
        let ambientLight = new THREE.AmbientLight( 0xabfff8, 0.7 );
        this.#scene.add(ambientLight);

        var dirLight = new THREE.DirectionalLight( 0xabfff8, 0.8 );
        dirLight.position.copy(this.#sun.Position)
        dirLight.name = "dirlight";
        dirLight.castShadow = true;
        this.#scene.add(dirLight);
    }

    #setupMenuEvents = () => {
        $(".hangar-sub-menu-heading").hover(
            function() {
                //on hover
                $(this).parent().addClass("hangar-sub-menu-container-hover");
            },
            function() {
                //on un-hover
                $(this).parent().removeClass("hangar-sub-menu-container-hover");
            }
        );

        $(".hangar-sub-menu-heading").click(function() {
            let contract = (jqObj) => {
                jqObj.parent().removeClass("hangar-sub-menu-container-expanded");
                jqObj.removeClass("hangar-sub-menu-heading-selected");
            }
            if ($(this).parent().is(".hangar-sub-menu-container-expanded")) {
                //if already expanded, then contract
                contract($(this));
            }
            else {
                //if not expanded, then expand and contract all other sub menu containers
                $(".hangar-sub-menu-heading-selected").each(function() {
                    contract($(this));
                });

                $(this).parent().addClass("hangar-sub-menu-container-expanded");
                $(this).addClass("hangar-sub-menu-heading-selected");
            }
        });

        //bind hue slider to player's hue
        $('#shipHueSlider').on('input', (event) => {
            this.#player.ShipHue = event.target.value;
        })
    }

    #initialiseGameObjects = () => {
        this.#gameObjects.forEach(g => {
            if (!g.Object.parent) {
                this.#scene.add(g.Object);
            }
        });
    }

    #startGameRunning = () => {
        this.#mode = this.#modes.GAMERUNNING;
        this.#animate();
    }

    #animate = () => {
        //regardless of pausing, animation frames should continue for menu logic
        requestAnimationFrame(() => { this.#animate(); });

        INPUT.UpdateKeyPressedOnce();

        //delta still needed for menu logic and so that physics doesn't jump ahead by a large delta after unpausing
        let dt = this.#clock.getDelta();

        if (INPUT.KeyPressedOnce("p")) {
            this.TogglePause();
        }
        
        //for debug purposes
        if (INPUT.KeyPressedOnce("t")) {
            this.SkyBox.visible = !this.SkyBox.visible;
            console.log(this.SkyBox.visible);
        }

        let playerOldPosition = this.#player.Position;

        //game logic only runs if game isn't paused
        if (this.#mode == this.#modes.GAMERUNNING) {
            this.#gameObjects.forEach(g => g.Main(dt));
    
            this.#gameObjects.forEach(g => {
                //physics logic here (later moved to physics handler probably)
                //[...]

                if (g instanceof PhysicsObject) {
                    g.PostPhysicsCallback(dt);
                }
            });

            //let pos = new THREE.Vector3();
            
            //this.Player.Object.localToWorld(pos);
            //this.randomCube.position.copy(pos.sub(new THREE.Vector3(0, 0, 10)));
            //console.log(this.Player.Object.position.z - this.randomCube.position.z);
        }

        //game logic that runs despite pausing
        this.#gameObjects.forEach(g => g.MainNoPause(dt));

        let playerPositionDelta = UTILS.SubVectors(this.#player.Position, playerOldPosition);
        if (this.#player.Position.length() < 400_000) {
            this.SkyBox.position.addScaledVector(playerPositionDelta, 0.95);
        }
        else {
            this.SkyBox.position.addScaledVector(playerPositionDelta, 1.0);
        }

        //must be done AFTER all other main logic has run
        INPUT.FlushKeyPressedOnce();

        this.#renderer.render(this.#scene, this.#camera);
    }
    
    //public methods
    AddGameObject(object) {
        if (object instanceof GameObject) {
            this.#gameObjects.push(object);
        }
        else {
            console.log(`GameHandler rejected object: ${object} as it was not a GameObject`, object);
        }
    }

    //resizes the renderer to fit the screen
    Resize() {
        this.#renderer.setSize(window.innerWidth, window.innerHeight);
        this.#camera.aspect = window.innerWidth / window.innerHeight;
        this.#camera.updateProjectionMatrix();
    }

    //toggles mode between running and paused. Will do nothing if mode is not currently one of the two.
    TogglePause() {
        switch(this.#mode) {
            case this.#modes.GAMERUNNING:
                this.Pause();
                break;
            case this.#modes.GAMEPAUSED:
                this.Unpause();
                break;
            default:
                console.log("Cannot toggle pause, game is not currently running or paused.");
                break;
        }
    }

    Pause() {
        this.#mode = this.#modes.GAMEPAUSED;
            
        //release mouse
        document.exitPointerLock();

        //show hangar menu
        $(".hangar-menu-base-container").addClass("hangar-menu-base-container-expanded");
    }

    Unpause() {
        this.#mode = this.#modes.GAMERUNNING;
            
        //reclaim mouse
        this.#renderer.domElement.requestPointerLock();

        //hide hangar menu
        $(".hangar-menu-base-container").removeClass("hangar-menu-base-container-expanded");
    }

    get Scene() { return this.#scene; }

    get Player() { return this.#player; }

    get Renderer() { return this.#renderer; }

    get IsPaused() { return this.#mode == this.#modes.GAMEPAUSED; }

    get Clock() { return this.#clock; }
}

export default GameHandler;
