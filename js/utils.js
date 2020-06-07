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

function LimitToRange(value, lowerBound, upperBound) {
    if (value < lowerBound) { return lowerBound; }
    if (value > upperBound) { return upperBound; }
    return value;
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

    Dispose() {
        window.GameHandler.Scene.remove(this.#line);
    }
}

function RandomFloatInRange(min, max) {
    return Math.random() * (max - min) + min;
}

function RayIntersectsSphere(lineStart, lineEnd, sphere) {
    let a = SubVectors(sphere.centre, lineStart).cross(SubVectors(sphere.centre, lineEnd));
    let b = SubVectors(lineEnd, lineStart);

    let perpDistFromLineToSphereSq = a.lengthSq() / b.lengthSq();

    return perpDistFromLineToSphereSq <= sphere.radius * sphere.radius;
}

// //also ray collision...
// function LineSegmentIntersectsSphereOld2(lineStart, lineEnd, sphere) {
//     let a = SubVectors(lineEnd, lineStart).lengthSq();
//     let b = -2 * ((lineEnd.x - lineStart.x) * (sphere.centre.x - lineStart.x) + (lineEnd.y - lineStart.y) * (sphere.centre.y - lineStart.y) + (sphere.centre.z - lineStart.z) * (lineEnd.z - lineStart.z));
//     //c = (xc − x1)2 + (yc − y1)2 + (zc − z1)2 − r2
//     let c = SubVectors(sphere.centre, lineStart).lengthSq() - Math.pow(sphere.radius, 2);

//     return Math.pow(b, 2) - 4 * a * c >= 0;
// }

// function LineSegmentIntersectsSphere(lineStart, lineEnd, sphere) {

// }

const Constants = {
    degToRad: 0.0174533,
    upVector: new THREE.Vector3(0, 1, 0)
}

export {
    AddVectors,
    SubVectors,
    LimitToRange,
    Mod,
    RedDebugLine,
    RandomFloatInRange,
    RayIntersectsSphere,
    Constants
}
