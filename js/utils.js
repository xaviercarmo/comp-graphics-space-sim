import * as THREE from '../libraries/three.module.js';

function AddVectors(...vectors) {
    let total = new THREE.Vector3();
    vectors.forEach(vec => total.add(vec));

    return total;
}

function SubVectors(...vectors) {
    let total = vectors.splice(0, 1)[0].clone();
    vectors.forEach(vec => total.sub(vec));

    return total;
}

function LimitMagnitude(float, maxMagnitude) {
    if (float > maxMagnitude) { return maxMagnitude; }
    if (float < -maxMagnitude) { return -maxMagnitude; }
    return float;
}

function Mod(num1, modNum) {
    return (num1 % modNum + modNum) % modNum;
}

class RedDebugLine {
    //privates
    #geometry = new THREE.BufferGeometry();
    #positions = new Float32Array(2 * 3);
    #line;

    //publics
    static LineMaterial = new THREE.LineBasicMaterial({ color: 0xff0000 });

    constructor(from = new THREE.Vector3(0, 0, 0), to = new THREE.Vector3(0, 1, 0)) {
        this.#geometry.setAttribute('position', new THREE.BufferAttribute(this.#positions, 3));
        this.#line = new THREE.Line(this.#geometry, RedDebugLine.LineMaterial);
        this.#line.frustumCulled = false;
        this.From = from;
        this.To = to;

        window.GameHandler.Scene.add(this.#line);
    }

    set From(vector) {
        this.#positions[0] = vector.x;
        this.#positions[1] = vector.y;
        this.#positions[2] = vector.z;

        this.#geometry.attributes.position.needsUpdate = true;
    }

    set To(vector) {
        this.#positions[3] = vector.x;
        this.#positions[4] = vector.y;
        this.#positions[5] = vector.z;

        this.#geometry.attributes.position.needsUpdate = true;
    }
}

function RandomFloatInRange(min, max) {
    return Math.random() * (max - min) + min;
}

const Constants = {
    degToRad: 0.0174533,
    upVector: new THREE.Vector3(0, 1, 0)
}

export {
    AddVectors,
    SubVectors,
    LimitMagnitude,
    Mod,
    RedDebugLine,
    RandomFloatInRange,
    Constants
}
