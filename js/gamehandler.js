import * as THREE from '../libraries/three.module.js';
import * as INPUT from './input.js';
import * as UTILS from './utils.js';

import AssetHandler from './assethandler.js';
import GameObject from './gameobject.js';
import PhysicsObject from './gameobjects/physics.js';
import PlayerObject from './gameobjects/physicsobjects/player.js';
import EnemyObject from './gameobjects/physicsobjects/enemy.js';
import SunObject from './gameobjects/sun.js';

import { EffectComposer } from '../libraries/EffectComposer.js';
import { RenderPass } from '../libraries/RenderPass.js';
import { ShaderPass } from '../libraries/ShaderPass.js';
import { UnrealBloomPass } from '../libraries/UnrealBloomPass.js';
import { FXAAShader } from '../libraries/FXAAShader.js';

class GameHandler {
    
    //privates
    #camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 1, 100_000);
    
    #renderer = new THREE.WebGLRenderer({ antialias: true });
    #bloomEnabled = true;
    #bloomComposer = new EffectComposer(this.#renderer);
    #bloomHighComposer = new EffectComposer(this.#renderer);
    #variableBloomComposer = new EffectComposer(this.#renderer);
    #variableBloomPass;
    #finalComposer = new EffectComposer(this.#renderer);
    #darkMaterial = new THREE.MeshBasicMaterial({ color: "black" });
    #materials = {};
    #bloomLights = {};
    #nonBloomLightIntensities = {};

    #clock = new THREE.Clock();

    #gameObjects = [];
    #projectiles = new Set();

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

    #isMainMenuTransitioning = false;

    #player;
    #sun;
    #ambientLight;
    #sunLight;

    //ENEMY
    #enemyLightsPool = [];
    #maxEnemies = 5;
    #currSize;  

    #scene = new THREE.Scene();

    //publics
    AssetHandler = new AssetHandler();

    //public so that other classes can assign themselves to a layer
    RenderLayers = {
        BLOOM_STATIC: 1,
        BLOOM_STATIC_HIGH: 2,
        BLOOM_VARYING: 3
    };

    constructor() {
        this.#mode = this.#modes.PRELOADING;
        this.AssetHandler.LoadAllAssets(() => this.#initialise.call(this));
    }

    //private methods
    //NOTE: Due to current lack of support in Chrome for private instance methods we will use private fields that hold methods
    #initialise = () => {
        try {
            this.#mode = this.#modes.INITIALISING;
            
            //later can extend this to animate the cursor
            $("body").css({ "cursor": "url(assets/cursors/scifi.png), auto" });
            this.#initialiseScene();
            this.#startMainMenu();
            window.setTimeout(() => $(".pre-downloader").fadeOut(), 1000);
        }
        catch(err) {
            console.log(err);
        }
    }

    #initialiseScene = () => {
        this.#setupMainMenuEvents();

        this.#setupPauseMenuEvents();

        this.#initialiseRenderer();

        this.#initialisePlayer();

        this.#initialiseSkyBox();

        this.#initialiseSun();

        this.#initialiseGameObjects();

        this.#setupEnemyLightsPool(this.#maxEnemies);
        

        // a cube for testing bloom
        // let randomCubeGeo = new THREE.BoxGeometry(5, 5, 5);
        // let randomCubeMat = new THREE.MeshBasicMaterial({ color: 0x0000ff });
        // let randomCube = new THREE.Mesh(randomCubeGeo, randomCubeMat);
        // randomCube.layers.enable(this.RenderLayers.BLOOM_STATIC);
        // randomCube.position.y += 5;
        // this.#scene.add(randomCube);
    }

    #initialiseRenderer = () => {
        window.addEventListener("resize", () => { this.Resize(); });
        
        document.addEventListener("visibilitychange", () => {
            if (document.hidden && this.IsGameRunning) {
                this.Pause();
            }
        }, false)

        document.body.appendChild(this.#renderer.domElement);

        this.#renderer.setPixelRatio(window.devicePixelRatio);
        this.#renderer.setSize(window.innerWidth, window.innerHeight);
        this.#renderer.shadowMap.enabled = true;
        this.#renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        
        this.#bloomComposer.setSize(window.innerWidth, window.innerHeight);
        this.#bloomHighComposer.setSize(window.innerWidth, window.innerHeight);
        this.#variableBloomComposer.setSize(window.innerWidth, window.innerHeight);
        this.#finalComposer.setSize(window.innerWidth, window.innerHeight);

        let renderScene = new RenderPass(this.#scene, this.#camera);
        
        let bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.2, 0.6, 0.0);
        //setup this composer to copy the scene as a texture, pass it to the bloom pass and then process bloom
        this.#bloomComposer.renderToScreen = false;
        this.#bloomComposer.addPass(renderScene);
        this.#bloomComposer.addPass(bloomPass);

        //alternate bloom pass for items requiring a high bloom
        let bloomHighPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 4.0, 0.01, 0.0);
        this.#bloomHighComposer.renderToScreen = false;
        this.#bloomHighComposer.addPass(renderScene);
        this.#bloomHighComposer.addPass(bloomHighPass);

        this.#variableBloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 2, 0.5, 0.0);
        this.#variableBloomComposer.renderToScreen = false;
        this.#variableBloomComposer.addPass(renderScene);
        this.#variableBloomComposer.addPass(this.#variableBloomPass);

        let fxaaPass = new ShaderPass(FXAAShader);
        fxaaPass.uniforms.resolution.value.set(1 / window.innerWidth, 1 / window.innerHeight);

        // the final pass composites the results of the bloom passes with the actual rendered scene
        let finalPassMaterial = new THREE.ShaderMaterial({
            uniforms: {
                baseTexture: { value: null },
                bloomTexture: { value: this.#bloomComposer.readBuffer.texture }, //note: readBuffer contains result of last pass in the composer
                bloomHighTexture: { value: this.#bloomHighComposer.readBuffer.texture },
                variableBloomTexture: {value: this.#variableBloomComposer.readBuffer.texture }
            },
            vertexShader: this.AssetHandler.LoadedShaders.vert.baseUv,
            fragmentShader: this.AssetHandler.LoadedShaders.frag.sceneAndBloomAdditive,
            defines: {}
        });
        let finalPass = new ShaderPass(finalPassMaterial, "baseTexture");
        finalPass.needsSwap = true;

        this.#finalComposer.addPass(renderScene);
        this.#finalComposer.addPass(fxaaPass);
        this.#finalComposer.addPass(finalPass);
    }

    #initialisePlayer = () => {
        let playerMeshes = {
            // ship: this.AssetHandler.LoadedAssets.medium_ship.clone(),
            // ship: this.AssetHandler.LoadedAssets.ship.clone(),
            light_ship: this.AssetHandler.LoadedAssets.light_ship.clone(),
            medium_ship: this.AssetHandler.LoadedAssets.medium_ship.clone(),
            heavy_ship: this.AssetHandler.LoadedAssets.heavy_ship.clone(),
            gattling_gun: this.AssetHandler.LoadedAssets.gattling_gun.clone(),
            rail_gun: this.AssetHandler.LoadedAssets.rail_gun.clone(),
            gattling_gun_new: {
                base_plate: this.AssetHandler.LoadedAssets.gattling_gun_base_plate.clone(),
                struts: this.AssetHandler.LoadedAssets.gattling_gun_struts.clone(),
                barrel: this.AssetHandler.LoadedAssets.gattling_gun_barrel.clone()
            }
        };

        let playerTextures = {
            light_ship: this.AssetHandler.LoadedImages.playerShipTextures.lightShipTexture,
            medium_ship: this.AssetHandler.LoadedImages.playerShipTextures.mediumShipTexture,
            heavy_ship: this.AssetHandler.LoadedImages.playerShipTextures.heavyShipTexture
        }

        let playerAssets = {
            meshes: playerMeshes,
            textures: playerTextures
        }

        this.#player = new PlayerObject(playerAssets, this.#camera);
        this.AddGameObject(this.#player);

        let test = new EnemyObject();
        this.test = test;
        this.AddGameObject(test);

        test = new EnemyObject();
        test.Position.add(new THREE.Vector3(100, 100, 50));
        this.AddGameObject(test);
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

        this.SkyBox = skyBox; // for debugging purposes
    }

    #initialiseSun = () => {
        this.#sun = new SunObject();
        this.#sun.Position = new THREE.Vector3(0, 0, 49_000);
        this.AddGameObject(this.#sun);

        this.SkyBox.add(this.#sun.Object); // for debugging purposes
        
        this.#ambientLight = new THREE.AmbientLight(0xabfff8, 0.4);
        this.#scene.add(this.#ambientLight);
        this.RegisterBloomLight(this.#ambientLight);

        this.#sunLight = new THREE.DirectionalLight(0xabfff8, 1.2);
        this.#sunLight.position.copy(this.#sun.Position);
        this.#sunLight.castShadow = true;
        this.#scene.add(this.#sunLight);

        // restrict the frustum of the sun light's shadow camera
        let size = 10;
        this.#sunLight.shadow.camera.left = -size;
        this.#sunLight.shadow.camera.right = size;
        this.#sunLight.shadow.camera.top = size;
        this.#sunLight.shadow.camera.bottom = -size;
        this.#sunLight.shadow.camera.far = 100000;
        this.#sunLight.shadow.mapSize.width = 1024;
        this.#sunLight.shadow.mapSize.height = 1024;
        // make the sun light track the player
        this.#sunLight.target = this.#player.Object;

        // for viewing the shadow camera frustum
        // this.#scene.add(new THREE.CameraHelper(this.#sunLight.shadow.camera));
    }

    #setupMainMenuEvents = () => {
        //need to call this whenever the main menu is accessed...right now the player could create infinite profiles if they could get back
        //to the main menu
        if (this.#getAllSaveGameIds().length >= 10) {
            $('#newGame').addClass('menu-button-disabled');
        }

        $(".menu-button, .back-menu-button").hover(
            (event) => {
                if (!$(event.target).is('.menu-button-disabled')) {
                    $(event.target).addClass('menu-button-hover');
                }
            },
            (event) => {
                $(event.target).removeClass('menu-button-hover');
            }
        );
        
        $('#newGame').click(() => {
            if (!this.#isMainMenuTransitioning && !$('#newGame').is('.menu-button-disabled')) {
                this.#transitionMainMenu(true, '#menuItems');
                $('#title').css('opacity', 0);
                this.#player.CameraPosition = 'HANGAR';
                window.setTimeout(() => {
                    $('#classMenu').addClass('hangar-menu-base-container-expanded');
                    window.setTimeout(() => {
                        $(`#${this.#player.Class}ClassHeading`).click();
                    }, 300);
                }, 1000);
            }
        });

        // setting up additional click handlers for the class selection buttons. They already have handlers
        // from the pause-menu setup (as they share that functionality)
        $('#lightClassHeading').click(() => {
            this.#player.Class = 'light';
        });

        $('#mediumClassHeading').click(() => {
            this.#player.Class = 'medium';
        });

        $('#heavyClassHeading').click(() => {
            this.#player.Class = 'heavy';
        });

        // setup events related to the call sign input (and all menu inputs)
        $('.menu-input').focus(function() {
            $(this).parent().addClass('menu-input-container-focused');
        });

        $('.menu-input').focusout(function() {
            $(this).parent().removeClass('menu-input-container-focused');
        });

        $('#callSignInput').on('input', function() {
            if ($(this).val() != '' && localStorage.getItem(PlayerObject.SaveGamePrefix + $(this).val().toLowerCase()) == null) {
                $(this).css('background-color', '#005e61');
                $('#classMenuStartButton').removeClass('menu-button-disabled');
            }
            else {
                $(this).css('background-color', '#690000');
                $('#classMenuStartButton').addClass('menu-button-disabled');
            }
        });

        $('#classMenuStartButton').click((event) => {
            if (!$(event.target).is('.menu-button-disabled')) {
                this.#player.SaveToLocalStorage($('#callSignInput').val());
                $('#classMenu').removeClass('hangar-menu-base-container-expanded');

                this.#startGameRunning();
            }
        });

        $('#classMenuBackButton').click(() => {
            $('#classMenu').removeClass('hangar-menu-base-container-expanded');
            this.#player.CameraPosition = 'FOLLOW';
            $('#title').css('opacity', 1);
            this.#transitionMainMenu(false, undefined, '#menuItems');
        });

        $('#loadGame').click(() => {
            if (!this.#isMainMenuTransitioning) {
                $('#loadGameItems .menu-button').remove();

                let didFindIds = false;
                for (let id of this.#getAllSaveGameIds()) {
                    didFindIds = true;
                    $('.menu-button-template')
                        .clone(true)
                        .text(id.substr(PlayerObject.SaveGamePrefix.length))
                        .toggleClass(['menu-button-template', 'menu-button-right'])
                        .click(() => this.#onSaveGameButtonClick(id))
                        .prependTo('#loadGameItems');
                }

                if (!didFindIds) {
                    $('.menu-button-template')
                        .clone()
                        .text('No save games')
                        .toggleClass(['menu-button-template', 'menu-button-right'])
                        .prependTo('#loadGameItems');
                }

                this.#transitionMainMenu(true, '#menuItems', '#loadGameItems');
            }
        });

        $('#loadGameBack').click(() => {
            if (!this.#isMainMenuTransitioning) {
                this.#transitionMainMenu(false, '#loadGameItems', '#menuItems');
            }
        });
    }

    #getAllSaveGameIds = () => {
        return Object.keys(localStorage).filter(key => key.startsWith('playerSave-'));
    }

    #onSaveGameButtonClick = (id) => {
        this.#player.LoadFromLocalStorage(id);
        this.#transitionMainMenu(false, '#loadGameItems', undefined, this.#startGameRunning);
    }

    // gets all the currently visible main menu buttons, swipes them out of view in
    // order, disabling input (sets mainMenuTransitioning = true) until the final anim
    // is complete.
    #transitionMainMenu = (forwards, fromSelector, toSelector, onComplete) => {
        this.#isMainMenuTransitioning = true;

        let fromMenu = $(fromSelector);
        let fromButtons = fromMenu.children() ?? [];
        
        let toMenu = $(toSelector);
        let toButtons = toMenu.children() ?? [];

        let fromInterval = fromButtons.length > 5 ? 10 : 30;
        let toInterval = toButtons.length > 5 ? 10 : 30;
        
        //fade the old buttons out
        fromButtons.each((i, button) => {
            let time = !forwards
                ? (fromButtons.length - 1 - i) * fromInterval
                : i * fromInterval;

            window.setTimeout(() => {
                if (forwards) {
                    $(button).addClass('menu-button-left');
                }
                else {
                    $(button).addClass('menu-button-right');
                }

                window.setTimeout(() => {
                    if (i == fromButtons.length - 1) {
                        fromMenu.addClass('main-menu-screen-hidden');

                        if (fromButtons.length >= toButtons.length) {
                            this.#isMainMenuTransitioning = false;
                            onComplete?.();
                        }
                    }
                }, 300 + (fromButtons.length - 1) * fromInterval);
            }, time);
        });

        //fade the new buttons in
        toMenu.removeClass('main-menu-screen-hidden');
        toButtons.each((i, button) => {
            let time = !forwards
                ? (toButtons.length - 1 - i) * toInterval
                : i * toInterval;

            window.setTimeout(() => {
                if (forwards) {
                    $(button).removeClass('menu-button-right');
                }
                else {
                    $(button).removeClass('menu-button-left');
                }
    
                window.setTimeout(() => {
                    if (i == toButtons.length - 1 && toButtons.length >= fromButtons.length) {
                        this.#isMainMenuTransitioning = false;
                        onComplete?.();
                    }
                }, 300 + (toButtons.length - 1) * toInterval);
            }, time);
        });
    }

    #setupPauseMenuEvents = () => {
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
            //if already expanded and not a class selector, then contract
            if ($(this).parent().is(".hangar-sub-menu-container-expanded") && !$(this).parents('#classMenu').length) {
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

        $('#shipHueSlider').on('input', (event) => {
            $('#shipSaturationSlider').css('background-image', `linear-gradient(to right, #444, hsl(${event.target.value * 360}, 100%, 50%))`);
            $('#shipLuminositySlider').css('background-image', `linear-gradient(to right, rgba(0, 0, 0, 0.001), hsl(${event.target.value * 360}, 100%, 50%))`);
            this.#player.ShipHue = event.target.value;
        });

        $('#shipSaturationSlider').on('input', (event) => {
            this.#player.ShipSaturation = event.target.value;
        });

        $('#shipValueSlider').on('input', (event) => {
            this.#player.ShipValue = event.target.value;
        });

        $('#shipLuminositySlider').on('input', (event) => {
            this.#player.ShipLuminosity = event.target.value;
            this.#variableBloomPass.strength = event.target.value;
        });

        let params = {
            type: 'double',
            min: 0,
            max: 1,
            from: 0.5,
            to: 1,
            step: 0.001,
            drag_interval: true,
            skin: 'flat',
            hide_min_max: true,
            onChange: (data) => {
                this.#player.ShipHueMask = new THREE.Vector2(data.from, data.to);
            }
        };

        //setup ion sliders
        $('#shipHueMaskSlider').ionRangeSlider(params);

        params.from = 0;
        params.onChange = (data) => { this.#player.ShipSaturationMask = new THREE.Vector2(data.from, data.to); };
        $('#shipSaturationMaskSlider').ionRangeSlider(params);

        params.onChange = (data) => { this.#player.ShipValueMask = new THREE.Vector2(data.from, data.to); };
        $('#shipValueMaskSlider').ionRangeSlider(params);
    }

    #initialiseGameObjects = () => {
        this.#gameObjects.forEach(g => {
            if (!g.Object.parent) {
                this.#scene.add(g.Object);
            }
        });
    }

    #startMainMenu = () => {
        INPUT.ShouldPreventDefaultEvents(false);

        this.#mode = this.#modes.MAINMENU;

        $('#mainMenu').css('display', 'flex');
        this.#player.InputEnabled = false;

        this.#player.Object.quaternion.set(0.06965684352995981, 0.2830092298553505, -0.027317522035930145, 0.9561942548227021);

        // this.#startGameRunning();

        this.#animate();
    }

    #startGameRunning = () => {
        INPUT.ShouldPreventDefaultEvents(true);
        this.#player.CameraPosition = 'FOLLOW';
        this.#player.InputEnabled = true;
        this.#player.SetupPointerLock();
        $('#mainMenu').css('opacity', '0');
        window.setTimeout(() => $('#mainMenu').css('display', 'none'), 300);
        this.#mode = this.#modes.GAMERUNNING;
    }

    #animate = () => {
        //regardless of pausing, animation frames should continue for menu logic
        requestAnimationFrame(() => { this.#animate(); });

        INPUT.UpdateKeyPressedOnce();

        //delta still needed for menu logic and so that physics doesn't jump ahead by a large delta after unpausing
        let dt = this.#clock.getDelta();

        if (INPUT.KeyPressedOnce("p") && !this.IsMainMenu) {
            this.TogglePause();
        }
        
        //for debug purposes
        if (INPUT.KeyPressedOnce("t")) {
            this.SkyBox.visible = !this.SkyBox.visible;
        }

        let playerOldPosition = this.#player.Position;

        //game logic only runs if game isn't paused
        if (this.#mode == this.#modes.GAMERUNNING) {
            this.#gameObjects.forEach(gameObject => gameObject.Main(dt));

            this.#projectiles.forEach(projectile => {
                projectile.Main(dt);
                if (projectile.IsExpired) {
                    this.#projectiles.delete(projectile);
                }
            });

            // this.#gameObjects.forEach(g => {
            //     //physics logic here (later moved to physics handler probably)
            //     //[...]

            //     if (g instanceof PhysicsObject) {
            //         g.PostPhysicsCallback(dt);
            //     }
            // });

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
        
        if (this.#bloomEnabled) {
            this.#turnOffNonBloomLights();

            // this.#scene.background = new THREE.Color(0x000);
            this.#darkenNonBloomTargets(this.RenderLayers.BLOOM_STATIC);
            this.#bloomComposer.render();
            this.#restoreOriginalMaterials();

            this.#darkenNonBloomTargets(this.RenderLayers.BLOOM_STATIC_HIGH);
            this.#bloomHighComposer.render();
            this.#restoreOriginalMaterials();

            this.#darkenOrMaskNonVariableBloomTargets();
            let oldAmbientIntensity = this.#ambientLight.intensity;
            this.#ambientLight.intensity = 0.8;
            this.#variableBloomComposer.render();
            this.#restoreOriginalMaterials();
            this.#ambientLight.intensity = oldAmbientIntensity;

            this.#restoreNonBloomLights();

            // this.#scene.background = this.AssetHandler.LoadedCubeMaps.sky;
            this.#finalComposer.render();
        }
        else {
            this.#renderer.render(this.#scene, this.#camera);
        }
    }

    #turnOffNonBloomLights = () => {
        this.#scene.traverse(obj => {
            if (obj instanceof THREE.Light && !this.#bloomLights[obj.uuid]) {
                this.#nonBloomLightIntensities[obj.uuid] = obj.intensity;
                obj.intensity = 0;
            }
        });
    }

    #restoreNonBloomLights = () => {
        this.#scene.traverse(obj => {
            if (this.#nonBloomLightIntensities[obj.uuid]) {
                obj.intensity = this.#nonBloomLightIntensities[obj.uuid];
                delete this.#nonBloomLightIntensities[obj.uuid];
            }
        });
    }

    #darkenNonBloomTargets = (bloomMask) => {
        this.#scene.traverse(obj => {
            if (obj.material && obj.layers) {
                if (!this.#testRenderLayer(obj.layers.mask, bloomMask)) {
                    this.#materials[obj.uuid] = obj.material;
                    obj.material = obj.customMaskMaterial ?? this.#darkMaterial;
                }
                else if (obj.material.opacityForBloom != undefined) {
                    this.#materials[obj.uuid] = obj.material.opacity;
                    obj.material.opacity = obj.material.opacityForBloom;
                }
                else {
                    obj.setMaskInverse?.(true);
                }
            }
            else if (obj.layers && this.#testRenderLayer(obj.layers.mask, bloomMask)) {
                console.log(obj);
            }
        });
    }

    #darkenOrMaskNonVariableBloomTargets = () => {
        this.#scene.traverse(obj => {
            if (obj.material && obj.layers) {
                // if this object is part of the bloom_varying layer and it is set up properly mask out fragments
                // that should not be bloomed
                if (this.#testRenderLayer(obj.layers.mask, this.RenderLayers.BLOOM_VARYING) && obj.setMaskInverse) {
                    obj.setMaskInverse(true);
                }
                // otherwise just darken the material
                else {
                    this.#materials[obj.uuid] = obj.material;
                    obj.material = obj.customMaskMaterial ?? this.#darkMaterial;
                }
            }
        });
    }

    #restoreOriginalMaterials = () => {
        this.#scene.traverse(obj => {
            if (this.#materials[obj.uuid] != undefined) {
                if (obj.material.opacityForBloom != undefined) {
                    obj.material.opacity = this.#materials[obj.uuid];
                }
                else {
                    obj.material = this.#materials[obj.uuid];
                }

                delete this.#materials[obj.uuid];
            }
            else {
                obj.setMaskInverse?.(false);
            }
        });
    }

    #testRenderLayer = (mask, layer) => {
        return mask & Math.pow(2, layer);
    }

    #setupEnemyLightsPool = (quantity) => {
        //Quantity - specifies number of enemies & number of points lights 

        for(let i = 0; i < quantity; i++){
            let pLight = new THREE.PointLight(0xff1000, 1, 15);
            //adding point light to light pool 
            this.#enemyLightsPool[i] = pLight; 
            //this.#enemyLightsPool.push(pLight);
        }
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

    AddProjectile(projectile) {
        this.#projectiles.add(projectile);
    }

    //resizes the renderer to fit the screen
    Resize() {
        this.#camera.aspect = window.innerWidth / window.innerHeight;
        this.#camera.updateProjectionMatrix();

        this.#renderer.setSize(window.innerWidth, window.innerHeight);

        this.#bloomComposer.setSize(window.innerWidth, window.innerHeight);
        this.#bloomHighComposer.setSize(window.innerWidth, window.innerHeight);
        this.#variableBloomComposer.setSize(window.innerWidth, window.innerHeight);
        this.#finalComposer.setSize(window.innerWidth, window.innerHeight);
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
        $("#pauseMenu").addClass("hangar-menu-base-container-expanded");
    }

    Unpause() {
        this.#mode = this.#modes.GAMERUNNING;
            
        //reclaim mouse
        this.#renderer.domElement.requestPointerLock();

        //hide hangar menu
        $("#pauseMenu").removeClass("hangar-menu-base-container-expanded");
    }

    RegisterBloomLight(light) {
        if (light instanceof THREE.Light) {
            this.#bloomLights[light.uuid] = light;
        }
    }

    SetVariableBloomPassStrength(strength) {
        this.#variableBloomPass.strength = strength;
    }

    SpawnEnemy(){
        //Check if there's less enemies
        //than what was set
        this.#currSize = this.EnemyObjects.length;
        //placeholder value, maxenemies
        //Generate new enemy; more of a respawner
        if(this.#currSize != 2) {
            let newEnemy = new EnemyObject(); 
            this.AddGameObject(newEnemy);
            this.#scene.add(newEnemy.Object); //render enemy to scene.
            console.log("New enemy spawned."); 
        }          
    }
    DespawnEnemy(enemy) {
        this.#scene.remove(enemy);
        let gameObjectIndex = this.#gameObjects.indexOf(enemy); 
        this.#gameObjects.splice(gameObjectIndex, 1);
        this.#isDead = true;
        
        console.log("Enemy dead.");
        this.#currSize = this.EnemyObjects.length;
        console.log(this.#currSize, "currentsize");
        this.SpawnEnemy();
        
    }

    get Scene() { return this.#scene; }

    get Player() { return this.#player; }

    get Renderer() { return this.#renderer; }

    get IsMainMenu() { return this.#mode == this.#modes.MAINMENU; }

    get IsPaused() { return this.#mode == this.#modes.GAMEPAUSED; }

    get IsGameRunning() { return this.#mode == this.#modes.GAMERUNNING; }

    get Clock() { return this.#clock; }

    get Camera() { return this.#camera; }

    get EnemyObjects() {
        let result = [];
        this.#gameObjects.forEach(object => {
            if (object instanceof EnemyObject) {
                result.push(object);
            }
        });

        return result;
    }

    get GameObjects() {
        return this.#gameObjects;
    }
}

export default GameHandler;
