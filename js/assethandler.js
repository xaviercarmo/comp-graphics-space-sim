import * as THREE from '../libraries/three.module.js';
import { FBXLoader } from '../libraries/FBXLoader.js';
import { GLTFLoader } from '../libraries/GLTFLoader.js';
import { OBJLoader } from '../../libraries/OBJLoader.js';

class AssetHandler {
    //privates
    #assetLoadingStates = {};
    #domLoadingBar;

    #fbxAssetPaths = {
        // ship: '../assets/SciFi_Fighter.FBX',
        light_ship: '../assets/player_ships/light_ship.fbx',
        medium_ship: '../assets/player_ships/medium_ship.fbx',
        heavy_ship: '../assets/player_ships/heavy_ship.fbx',
        // gattling_gun: '../assets/gattling_gun.fbx',
        // rail_gun: '../assets/rail_gun.fbx',
        // gattling_gun_base_plate: '../assets/guns/gattling_gun/base_plate_origin.fbx',
        // gattling_gun_struts: '../assets/guns/gattling_gun/struts_origin.fbx',
        // gattling_gun_barrel: '../assets/guns/gattling_gun/barrel_origin.fbx',
        enemy_ship: '../assets/enemy_ships/enemy_ship.fbx',
        enemy_tracker: '../assets/enemy_tracker.fbx',
        diamond_bullet: '../assets/diamond_bullet.fbx',
        asteroid1: '../assets/asteroids/asteroid1.fbx',
        asteroid2: '../assets/asteroids/asteroid2.fbx',
        asteroid3: '../assets/asteroids/asteroid3.fbx',
        asteroid4: '../assets/asteroids/asteroid4.fbx',
        asteroid5: '../assets/asteroids/asteroid5.fbx',
        asteroid6: '../assets/asteroids/asteroid6.fbx',
        asteroid7: '../assets/asteroids/asteroid7.fbx',
        asteroid8: '../assets/asteroids/asteroid8.fbx',
        asteroid9: '../assets/asteroids/asteroid9.fbx',
        asteroid10: '../assets/asteroids/asteroid10.fbx'
    }

    //not required at the moment
    #glbAssetPaths = {
        health_capsule: '../assets/healthboost.glb'
    }

    #shaderPaths = {
        vert: {
            baseUv: 'baseUv',
            sun: 'sun',
            rockParticle: 'rockParticle',
            particleColoured: 'particleColoured',
            shield: 'shield'
        },
        frag: {
            sceneAndBloomAdditive: 'sceneAndBloomAdditive',
            sun: 'sun',
            rockParticle: 'rockParticle',
            particleColoured: 'particleColoured',
            shield: 'shield',
            shieldMasked: 'shieldMasked'
        }
    }

    //publics
    OnComplete;
    LoadedAssets = {};
    LoadedCubeMaps = {};
    LoadedImages = {};
    LoadedShaders = { vert: {}, frag: {} };

    constructor() {}

    //private methods
    #download3DAsset = (assetPath) => {
        const assetState = { loaded: 0, total: 0, isComplete: false };
        this.#assetLoadingStates[assetPath] = assetState;

        //download 3D asset from path
        const AssetHandler = this;
        $.ajax({
            url: assetPath,
            type: 'GET',
            dataType: 'text',
            beforeSend: (jxhr) => {
                jxhr.overrideMimeType('application/json');
            },
            xhr: () => {
                let xhr = $.ajaxSettings.xhr();

                xhr.onprogress = (e) => {
                    assetState.loaded = e.loaded;
                    assetState.total = e.total;
                    AssetHandler.DomLoadingBar.width(`${AssetHandler.Progress * 100}%`);
                }

                return xhr;
            }
        })
        .done((data) => {
            assetState.isComplete = true;
            if (AssetHandler.IsComplete) {
                setTimeout(AssetHandler.OnComplete, 500);
            };
        })
        .fail((data) => { console.log(`ERROR LOADING ASSET: ${assetPath}`, data); });
    }

    #downloadCubeMap = (key, rootPath, fileNames, folderSizeBytes) => {
        const assetState = { loaded: 0, total: folderSizeBytes ?? 1, isComplete: false };
        this.#assetLoadingStates[rootPath] = assetState;

        this.LoadedCubeMaps[key] = new THREE.CubeTextureLoader()
            .setPath(rootPath)
            .load(fileNames,
                () => {
                    //on load (finished) function
                    assetState.loaded = assetState.total;
                    assetState.isComplete = true;
                    this.DomLoadingBar.width(`${this.Progress * 100}%`);

                    if (this.IsComplete) {
                        setTimeout(this.OnComplete, 500);
                    };
                },
                undefined,
                (e) => {
                    //on error function
                    console.log(`ERROR LOADING SKYMAP: ${e}`);
                }
            );
    }

    #downloadImages = (rootPath, rootKey, files) => {
        if (this.LoadedImages[rootKey ?? rootPath] == undefined) {
            this.LoadedImages[rootKey ?? rootPath] = {};
        }

        for (let i = 0; i < files.length; i++) {
            const assetState = { loaded: 0, total: files[i].size ?? 1, isComplete: false };
            this.#assetLoadingStates[rootPath + files[i].name] = assetState;

            this.LoadedImages[rootKey ?? rootPath][files[i].key ?? files[i].name] = 
                new THREE.TextureLoader().load(rootPath + files[i].name,
                    () => {
                        //on finished
                        assetState.loaded = assetState.total;
                        assetState.isComplete = true;
                        this.#domLoadingBar.width(`${this.Progress * 100}%`);

                        if (this.IsComplete) {
                            setTimeout(this.OnComplete, 500);
                        }
                    },
                    undefined,
                    (e) => {
                        //on error
                        console.log(`ERROR LOADING ${rootPath + files[i].name}: ${e}`);
                    }
                );
        }
    }

    #downloadShaders = () => {
        for (let shaderType in this.#shaderPaths) {
            for (let fileName in this.#shaderPaths[shaderType]) {
                let url = `../shaders/${shaderType}/${fileName}.${shaderType}`;

                const assetState = { loaded: 0, total: 1, isComplete: false };
                this.#assetLoadingStates[url] = assetState;

                fetch(url)
                    .then(response => response.text())
                    .then(shader => {
                        this.LoadedShaders[shaderType][fileName] = shader;

                        assetState.loaded = assetState.total;
                        assetState.isComplete = true;
                        this.#domLoadingBar.width(`${this.Progress * 100}%`);

                        if (this.IsComplete) {
                            setTimeout(this.OnComplete, 500);
                        }
                    });
            }
        }
    }

    #initialiseLoadingBar = () => {
        $('body').append($('<div>', { class: 'pre-downloader' }));
        
        let domPreDownloader = $('.pre-downloader');

        domPreDownloader
            .append('<div class="loading-text">Loading assets...</div>');

        domPreDownloader
            .append($('<div>', { class: 'loading-bar-container' })
            .append($('<div>', { class: 'loading-bar' })));

        this.#domLoadingBar = $('.loading-bar');
    }

    #downloadAllAssets = (onComplete) => {
        this.#initialiseLoadingBar();
        this.OnComplete = onComplete;

        // download all fbx models
        for (let key in this.#fbxAssetPaths) {
            this.#download3DAsset(this.#fbxAssetPaths[key]);
        }

        // download all glb models
        for (let key in this.#glbAssetPaths) {
            this.#download3DAsset(this.#glbAssetPaths[key]);
        }

        // manually download the skybox
        let skyMapFiles = [
            { name: 'front.png', size: 4100000, key: 'ft' },
            { name: 'back.png', size: 4200000, key: 'bk' },
            { name: 'top.png', size: 4000000, key: 'tp' },
            { name: 'bot.png', size: 3900000, key: 'bm' },
            { name: 'right.png', size: 4200000, key: 'rt' },
            { name: 'left.png', size: 4200000, key: 'lt' }
        ];
        this.#downloadImages('assets/cube_maps/lightblue/', 'skymap', skyMapFiles);

        // download the crosshair
        let mobileAlwaysFiles = [{ name: 'arcs.png', size: 71000, key: 'always/arcs' }];
        this.#downloadImages('assets/crosshairs/mobile/always/', 'crosshairMobile', mobileAlwaysFiles);

        let mobileSometimesFiles = [
            { name: 'bt.png', size: 11000, key: 'sometimes/bt' },
            { name: 'tl.png', size: 21000, key: 'sometimes/tl' },
            { name: 'tr.png', size: 22000, key: 'sometimes/tr' }
        ];
        this.#downloadImages('assets/crosshairs/mobile/sometimes/', 'crosshairMobile', mobileSometimesFiles)

        let stationaryFiles = [
            { name: 'halo.png', size: 14000, key: 'halo' },
            { name: 'rim.png', size: 139000, key: 'rim' }
        ];
        this.#downloadImages('assets/crosshairs/stationary/', 'crosshairStationary', stationaryFiles);

        // download the thruster sprites, sun sample sprite, and rock sprite
        let spriteFiles = [
            { name: 'thruster_sprite.png', size: 12000, key: 'thrusterSprite' },
            { name: 'white_square.png', size: 131, key: 'whiteSquare' },
            { name: 'sun_texture.png', size: 395, key: 'sunTexture' },
            { name: 'rock.png', size: 87800, key: 'rockSprite' },
            { name: 'enemy_circle.png', size: 133000, key: 'enemyCircle' },
            { name: 'shield_texture.png', size: 2960, key: 'shieldTexture' }
        ];
        this.#downloadImages('assets/sprites/', 'sprites', spriteFiles);

        // download the ship textures
        let shipTextureFiles = [
            { name: 'light_ship_texture.png', size: 326000, key: 'lightShipTexture' },
            { name: 'medium_ship_texture.jpg', size: 235000, key: 'mediumShipTexture' },
            { name: 'heavy_ship_texture.jpg', size: 375000, key: 'heavyShipTexture' }
        ];
        this.#downloadImages('assets/player_ships/', 'playerShipTextures', shipTextureFiles);
        
        let enemyShipTextureFiles = [
            { name: 'enemy_ship_texture.jpg', size: 228000, key: 'enemyShipTexture' }
        ];
        this.#downloadImages('assets/enemy_ships/', 'enemyShipTextures', enemyShipTextureFiles);

        // download all shaders
        this.#downloadShaders();
    }

    #loadAllAssets = (onComplete) => {
        let assetsLoadedCount = 0;
        let totalAssetsCount = Object.keys(this.#fbxAssetPaths).length + Object.keys(this.#glbAssetPaths).length;

        let onAssetLoaded = (key, obj) => {
            this.LoadedAssets[key] = obj;

            if (++assetsLoadedCount == totalAssetsCount) {
                onComplete();
            }
        }

        // load fbx models
        const fbxLoader = new FBXLoader();

        for (let key in this.#fbxAssetPaths) {
            fbxLoader.load(this.#fbxAssetPaths[key], (object) => {
                onAssetLoaded(key, object);
            });
        }

        // load glb models
        const gltfLoader = new GLTFLoader();

        for (let key in this.#glbAssetPaths) {
            gltfLoader.load(this.#glbAssetPaths[key], (gltf) => {
                onAssetLoaded(key, gltf);
            });
        }
    }

    //public methods
    LoadAllAssets(onLoadComplete) {
        this.#downloadAllAssets(() => {
            $('.loading-text').text('Initialising game...');

            window.setTimeout(() => this.#loadAllAssets(onLoadComplete), 0);
        });
    }

    get Progress() {
        let total = 0;
        let loaded = 0;

        for (const assetPath in this.#assetLoadingStates) {
            let assetState = this.#assetLoadingStates[assetPath];
            loaded += assetState.loaded;
            total += assetState.total;
        }

        return loaded / total;
    }

    get IsComplete() {
        for (const assetPath in this.#assetLoadingStates) {
            if (!this.#assetLoadingStates[assetPath].isComplete) return false;
        }

        return true;
    }

    get DomLoadingBar() { return this.#domLoadingBar; }
}

export default AssetHandler;
