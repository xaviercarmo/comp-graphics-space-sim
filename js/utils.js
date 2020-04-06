import * as THREE from '../libraries/three.module.js';
import { FBXLoader } from '../libraries/FBXLoader.js';

function AddVectors(...vectors) {
    let total = new THREE.Vector3();
    vectors.forEach(vec => total = total.addVectors(total, vec));

    return total;
}

function LoadAssets(assets, onCompleteAll) {
    let assetsLoadedCount = 0;
    const loader = new FBXLoader();

    for (const asset of assets) {
        loader.load(asset.path, (object) => {
            asset.onComplete(object);

            if (++assetsLoadedCount == assets.length) {
                onCompleteAll();
            }
        });
    }
}

export { AddVectors, LoadAssets }
