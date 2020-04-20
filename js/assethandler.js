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
        "../assets/rail_gun.fbx"
    ]
    LoadedCubeMaps = {};

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
                    assetState.loaded = folderSizeBytes ?? 1;
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

    #initialiseLoadingBar = () => {
        $("body").append($("<div>", { class: "pre-downloader" }));
        
        let domPreDownloader = $(".pre-downloader");

        domPreDownloader
            .append('<div class="loading-text">Loading Assets...</div>');

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
        //25000 bytes
        this.#loadCubeMap(
            "assets/cube_maps/lightblue/",
            [
                "right.png",
                "left.png",
                "top.png",
                "bot.png",
                "front.png",
                "back.png"
            ],
            25_000_000
        );
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
