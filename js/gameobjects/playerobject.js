import * as THREE from '../../libraries/three.module.js';
import * as INPUT from '../input.js';
import * as UTILS from '../utils.js';

import GameObject from '../gameobject.js';

class PlayerObject extends GameObject {
    //privates
    //camera vars
    #camera;
    #cameraPositions = {};
    #cameraPosition;

    //renderer dom element
    #canvas;

    //speed vars
    #currentSpeed = 0;
    #targetSpeed = 0;
    #maxSpeed = 1000;
    #targetSpeedAccel = 50;

    //mouse vars
    #scrollDelta = 0;
    #debugMouseOffset = new THREE.Object3D();
    #mouseOffset = new THREE.Vector2();
    #maxMouseOffset = 1000;
    #xPct = 0;
    #yPct = 0;

    //rotation vars
    #rotAmtX = 0;
    #rotAmtY = 0;
    #rotAmtXTimer = 0;
    #rotAmtYTimer = 0;
    #baseTargetAngles = {
        x: UTILS.Constants.degToRad * 10,
        y: UTILS.Constants.degToRad * 10,
        z: UTILS.Constants.degToRad * 35
    };
    #targetEuler = new THREE.Euler();
    #targetQuaternion = new THREE.Quaternion();

    #mainObjectTarget = new THREE.Object3D();

    constructor(object, camera) {
        super(object);

        this._mass = 10;

        this.#setupCameraPositions();
        this.CameraPosition = "FOLLOW";

        this.#setupDebugHelpers();

        this.#camera = camera;
        this._objectGroup.add(this.#camera);

        //this will be refactored out into a mthod called every frame
        this.#camera.position.copy(this.#cameraPositions.FOLLOW.posnTarg.position);
        this.#camera.lookAt(this.#cameraPositions.FOLLOW.lookTarg.position);

        this._objectGroup.scale.multiplyScalar(1);

        //setup mouse events
        window.addEventListener("wheel", this.#handleScroll);
    }

    #setupCameraPositions = () => {
        this.#cameraPositions.FOLLOW = {
            posnTarg: new THREE.Vector3(0, 7.6, -31.9),
            lookTarg: new THREE.Vector3(0, 15.5, 15)
        }

        this.#cameraPosition.HANGAR = {
            posnTarg: new THREE.Vector3(0, 7.6, -31.9),
            lookTarg: new THREE.Vector3(0, 15.5, 15)
        }

        this.#cameraPositions.HANGAR_GUN_SLOT = {
            posnTarg: new THREE.Vector3(0, 7.6, -31.9),
            lookTarg: new THREE.Vector3(0, 15.5, 15)
        }
    }

    #setupDebugHelpers = () => {
        let geo = new THREE.BoxGeometry(1, 1, 1);
        let matR = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        let matG = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
        let matB = new THREE.MeshBasicMaterial({ color: 0x0000ff });
        let matW = new THREE.MeshBasicMaterial({ color: 0xffffff });
        let cubeR = new THREE.Mesh(geo, matR);
        let cubeG = new THREE.Mesh(geo, matG);
        let cubeB = new THREE.Mesh(geo, matB);
        let cubeW = new THREE.Mesh(geo, matW);

        this.#cameraPositions.FOLLOW.lookTarg.add(cubeW);

        let centre = new THREE.Object3D();
        centre.position.set(0, 0, 30);
        centre.add(cubeG);
        this._objectGroup.add(centre);

        this.#debugMouseOffset.position.set(0, 0, 30);
        this.#debugMouseOffset.add(cubeR);
        this._objectGroup.add(this.#debugMouseOffset);

        this.#mainObjectTarget.position.copy(this.#debugMouseOffset.position);
        this.#mainObjectTarget.add(cubeB);
        this._objectGroup.add(this.#mainObjectTarget);
    }

    #handleScroll = (event) => {
        //initialise a scrollDelta so we know how much their mouse wheel is scrolling each time
        if (this.#scrollDelta == 0) {
            this.#scrollDelta = Math.abs(event.deltaY);
        }

        let scrollTicks = -event.deltaY / this.#scrollDelta;

        this.#targetSpeed = Math.min(this.#targetSpeed + scrollTicks * this.#targetSpeedAccel, this.#maxSpeed);
        if (this.#targetSpeed < 0) { this.#targetSpeed = 0; }
    }

    #handleMouseMove = (event) => {
        if (document.pointerLockElement === this.#canvas) {
            this.#mouseOffset.x += event.movementX;
            this.#mouseOffset.y += event.movementY;

            this.#mouseOffset.clampLength(-this.#maxMouseOffset, this.#maxMouseOffset);
        }
    }

    #adjustRotationAmounts = (dt) => {
        let lastXPct = this.#xPct;
        this.#xPct = this.#mouseOffset.x / this.#maxMouseOffset;

        let lastYPct = this.#yPct;
        this.#yPct = this.#mouseOffset.y / this.#maxMouseOffset;

        let deltaRotAmtX = this.#yPct - this.#rotAmtX;
        let deltaRotAmtY = -this.#xPct - this.#rotAmtY;

        if (deltaRotAmtY == 0 || (-lastXPct > this.#rotAmtY != -this.#xPct > this.#rotAmtY)) {
            this.#rotAmtYTimer = 0;
        }
        else {
            this.#rotAmtYTimer = Math.min(1, this.#rotAmtYTimer + dt);
        }

        if (deltaRotAmtX == 0 || (lastYPct > this.#rotAmtX != this.#yPct > this.#rotAmtX)) {
            this.#rotAmtXTimer = 0;
        }
        else {
            this.#rotAmtXTimer = Math.min(1, this.#rotAmtXTimer + dt);
        }

        let yTime = this.#rotAmtYTimer / 1;
        let xTime = this.#rotAmtXTimer / 1;
        this.#rotAmtX += UTILS.LimitMagnitude(deltaRotAmtX, (0.4 + 2 * xTime) * dt);
        this.#rotAmtY += UTILS.LimitMagnitude(deltaRotAmtY, (0.4 + 2 * yTime) * dt);

        this._objectGroup.rotateX(this.#rotAmtX * dt);
        this._objectGroup.rotateY(this.#rotAmtY * dt);

        let targetXAngle = this.#baseTargetAngles.x * this.#yPct; // back and forth
        let targetYAngle = this.#baseTargetAngles.y * this.#rotAmtY; // side to side
        let targetZAngle = this.#baseTargetAngles.z * this.#xPct; //barrel roll
        this.#targetEuler.set(targetXAngle, targetYAngle, targetZAngle);
        this.#targetQuaternion.setFromEuler(this.#targetEuler);

        this._mainObject.quaternion.slerp(this.#targetQuaternion, 1.6 * dt);
    }

    #adjustPositionOffset = (dt) => {
        let speedPct = this.#targetSpeed / this.#maxSpeed;
        this.#debugMouseOffset.position.x = -this.#xPct * (8 + 16 * speedPct);
        this.#debugMouseOffset.position.y = -this.#yPct * (8 + 16 * speedPct);

        this.#mainObjectTarget.position.x = this.#rotAmtY * (8 + 16 * speedPct);
        this.#mainObjectTarget.position.y = -this.#rotAmtX * (8 + 16 * speedPct);

        let modifiedTarg = new THREE.Vector3();

        let xyOffsetPct = 0.2 + (1 - 0.2) * speedPct;
        modifiedTarg.z += 8 * speedPct;
        modifiedTarg.y += 5 * this.#yPct * xyOffsetPct + 3 * speedPct;
        modifiedTarg.x -= 5 * -this.#xPct * xyOffsetPct;

        this._mainObject.position.lerp(modifiedTarg, 0.9 * dt);
    }

    //public methods
    Main(dt) {
        super.Main(dt);

        //move forward by current speed
        this.#currentSpeed = THREE.Math.lerp(this.#currentSpeed, this.#targetSpeed, 1.5 * dt);
        this._objectGroup.translateZ(this.#currentSpeed * dt);

        //handle all visual effects associated with current movement
        this.#adjustRotationAmounts(dt);
        this.#adjustPositionOffset(dt);

        this.#camera.position.lerp();
        this.#camera.lookAt(this.#cameraPosition.lookTarg.position);
    }

    PostPhysicsCallback(dt) {
        super.PostPhysicsCallback(dt);

        this.FlushForces();
    }

    SetupPointerLock() {
        this.#canvas = $("canvas")[0];

        this.#canvas.requestPointerLock = this.#canvas.requestPointerLock;
        this.#canvas.onclick = this.#canvas.requestPointerLock;

        document.addEventListener("pointerlockchange", (e) => {
            if (document.pointerLockElement === this.#canvas) {
                console.log("Pointer Locked");
            }
            else {
                console.log("Pointer Unlocked");
            }
        }, false)

        document.addEventListener("mousemove", this.#handleMouseMove);

        this.#canvas.requestPointerLock();
    }

    set CameraPosition(positionName) {
        if (this.#cameraPositions[positionName] != undefined) {
            this.#cameraPosition = this.#cameraPositions[positionName];
        }
        else {
            console.log(`"${positionName}" is an invalid camera position name.`);
        }
    }
}

export default PlayerObject;
