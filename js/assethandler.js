import * as THREE from '../libraries/three.module.js';

class AssetHandler {
    //privates
    #assetLoadingStates = {};
    #domLoadingBar;

    
    //publics
    OnComplete;
    AssetPaths3D = [
        "../assets/SciFi_Fighter.FBX",
        "../assets/gattling_gun.fbx",
        "../assets/rail_gun.fbx",
        "../assets/guns/gattling_gun/base_plate.fbx",
        "../assets/guns/gattling_gun/struts.fbx",
        "../assets/guns/gattling_gun/gun.fbx"
    ]
    LoadedCubeMaps = {};
    LoadedImages = {};

    constructor() {}

    //private methods
    #load3DAsset = (assetPath) => {
        const assetState = { loaded: 0, total: 0, isComplete: false };
        this.#assetLoadingStates[assetPath] = assetState;

        //download 3D asset from path
        const AssetHandler = this;
        $.ajax({
            url: assetPath,
            type: "GET",
            dataType: "text",
            beforeSend: (jxhr) => {
                jxhr.overrideMimeType("application/json");
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

    #loadCubeMap = (rootPath, fileNames, folderSizeBytes) => {
        const assetState = { loaded: 0, total: folderSizeBytes ?? 1, isComplete: false };
        this.#assetLoadingStates[rootPath] = assetState;

        this.LoadedCubeMaps[rootPath] = new THREE.CubeTextureLoader()
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

    #loadImages = (rootPath, rootKey, files = []) => {
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

    #initialiseLoadingBar = () => {
        $("body").append($("<div>", { class: "pre-downloader" }));
        
        let domPreDownloader = $(".pre-downloader");

        domPreDownloader
            .append('<div class="loading-text">Loading assets...</div>');

        domPreDownloader
            .append($("<div>", { class: "loading-bar-container" })
            .append($("<div>", { class: "loading-bar" })));

        this.#domLoadingBar = $(".loading-bar");
    }

    //public methods
    LoadAllAssets(onComplete) {
        this.#initialiseLoadingBar();
        this.OnComplete = onComplete;
        //load all 3d models
        this.AssetPaths3D.forEach(this.#load3DAsset);

        //load the skybox images
        //disabled for now because using manual skybox (below)
        //25000 bytes
        // this.#loadCubeMap(
        //     "assets/cube_maps/lightblue/",
        //     [
        //         "right.png",
        //         "left.png",
        //         "top.png",
        //         "bot.png",
        //         "front.png",
        //         "back.png"
        //     ],
        //     25_000_000
        // );

        // manually load the skybox
        let skyMapFiles = [
            { name: "front.png", size: 4100000, key: "ft" },
            { name: "back.png", size: 4200000, key: "bk" },
            { name: "top.png", size: 4000000, key: "tp" },
            { name: "bot.png", size: 3900000, key: "bm" },
            { name: "right.png", size: 4200000, key: "rt" },
            { name: "left.png", size: 4200000, key: "lt" }
        ];
        this.#loadImages("assets/cube_maps/lightblue/", "skymap", skyMapFiles);

        // load the crosshair
        let mobileAlwaysFiles = [{ name: "arcs.png", size: 71000, key: "always/arcs" }];
        this.#loadImages("assets/crosshairs/mobile/always/", "crosshairMobile", mobileAlwaysFiles);

        let mobileSometimesFiles = [
            { name: "bt.png", size: 11000, key: "sometimes/bt" },
            { name: "tl.png", size: 21000, key: "sometimes/tl" },
            { name: "tr.png", size: 22000, key: "sometimes/tr" }
        ];
        this.#loadImages("assets/crosshairs/mobile/sometimes/", "crosshairMobile", mobileSometimesFiles)

        let stationaryFiles = [
            { name: "halo.png", size: 14000, key: "halo" },
            { name: "rim.png", size: 139000, key: "rim" }
        ];
        this.#loadImages("assets/crosshairs/stationary/", "crosshairStationary", stationaryFiles);

        // load the thruster sprites
        let spriteFile = [
            { name: "thruster_sprite.png", size: 12000, key: "thrusterSprite" },
            { name: "white_square.png", size: 131, key: "whiteSquare" }
        ];
        this.#loadImages("assets/sprites/", "sprites", spriteFile);
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
