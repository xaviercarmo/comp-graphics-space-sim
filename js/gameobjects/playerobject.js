import * as THREE from '../../libraries/three.module.js';
import * as INPUT from '../input.js';
import * as UTILS from '../utils.js';

import GameObject from '../gameobject.js';

class PlayerObject extends GameObject {
    //privates
    #camera;
    #cameraLookOffset;

    constructor(object, camera) {
        super(object);

        this.#camera = camera;

        this.#camera.position.copy((UTILS.AddVectors(this._object.position, new THREE.Vector3(0, 7.5, -21))));

        this.#cameraLookOffset = new THREE.Vector3(0, 12, 15);
        this.#camera.lookAt(UTILS.AddVectors(this._object.position, this.#cameraLookOffset));
    }

    Main() {
        super.Main();

        if (INPUT.KeyPressed.w) {
            this._object.position.z += 0.2;
        }
        if (INPUT.KeyPressed.s) {
            this._object.position.z -= 0.2;
        }

        if (INPUT.KeyPressed.a) {
            this._object.rotation.y += 0.005;
        }
        if (INPUT.KeyPressed.d) {
            this._object.rotation.y -= 0.005;
        }

        if (INPUT.KeyPressed.space) {
            this._object.position.y += 0.2;
        }
        if (INPUT.KeyPressed.shift) {
            this._object.position.y -= 0.2;
        }

        if (INPUT.KeyPressed.l) {
            this.#camera.lookAt(this._object.position);
        }
        
        if (INPUT.KeyPressed.r) {
            this._object.rotation.x -= 0.005;
        }
        if (INPUT.KeyPressed.f) {
            this._object.rotation.x += 0.005;
        }

        this.#camera.position.copy((UTILS.AddVectors(this._object.position, new THREE.Vector3(0, 7.5, -21))));
    }
}

export default PlayerObject;
