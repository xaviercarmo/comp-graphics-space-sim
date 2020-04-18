class PreDownloader {
    //privates
    #assetLoadingStates = {};
    #domLoadingBar;

    //publics
    OnComplete;

    constructor(assetPaths, onComplete) {
        this.#initialiseLoadingBar();
        this.OnComplete = onComplete;

        assetPaths.forEach(this.#load);
    }

    //private methods
    #load = (assetPath) => {
        const assetState = { loaded: 0, total: 0, isComplete: false }
        this.#assetLoadingStates[assetPath] = assetState;

        const PreDownloader = this;
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
                    PreDownloader.DomLoadingBar.width(`${PreDownloader.Progress * 100}%`);
                }

                return xhr;
            }
        })
        .done((data) => {
            assetState.isComplete = true;
            if (PreDownloader.IsComplete) {
                setTimeout(PreDownloader.OnComplete, 500);
            };
        })
        .fail((data) => { console.log(`ERROR LOADING ASSET: ${assetPath}`, data); });
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

export default PreDownloader;
