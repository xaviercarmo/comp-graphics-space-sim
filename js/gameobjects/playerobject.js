import * as THREE from '../../libraries/three.module.js';
import * as INPUT from '../input.js';
import * as UTILS from '../utils.js';

import GameObject from '../gameobject.js';

import { OrbitControls } from '../../libraries/OrbitControls.js';

class PlayerObject extends GameObject {
    //privates
    //camera vars
    #camera;
    #cameraPositions = {};
    #oldCameraPosition;
    #cameraPosition;
    #cameraPositionOrder;
    #cameraCurve;
    #cameraTransitioning = false;
    #cameraTransitionDirection = 1;
    #cameraTransitionProgress = 0;
    #cameraTransitionCurves = {};
    #cameraLookTransition = new THREE.Vector3();
    #cameraLookMatrix = new THREE.Matrix4();
    #orbitControls;

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

    //equipment vars
    #currentGun;
    #gunNames = ["gattling_gun", "rail_gun"];
    #gunNameIndex = -1;

    //general
    #meshes;

    //debug
    #debugLine = new UTILS.RedDebugLine();

    constructor(meshes, camera) {
        super(meshes.ship);

        this._mass = 10;

        this.#meshes = meshes;
        this.#meshes.gattling_gun.scale.multiplyScalar(0.1);
        this.#meshes.rail_gun.scale.multiplyScalar(0.1);
        //this._mainObject.add(meshes.rail_gun);

        this.#setupCameraPositions();
        this.#setupCameraTransitionCurves();

        this.#setupDebugHelpers();

        this.#camera = camera;
        this._objectGroup.add(this.#camera);
        this.CameraPosition = "FOLLOW";

        window.addEventListener("wheel", this.#handleScroll);
    }

    #setupCameraPositions = () => {
        this.#cameraPositions.ORIGIN = {
            name: "ORIGIN",
            posnTarg: new THREE.Vector3(0, 0, 0),
            lookTarg: new THREE.Vector3(0, 0, 0)
        }

        this.#cameraPositions.FOLLOW = {
            name: "FOLLOW",
            posnTarg: new THREE.Vector3(0, 7.6, -31.9),
            lookTarg: new THREE.Vector3(0, 15.5, 15)
        }

        this.#cameraPositions.HANGAR = {
            name: "HANGAR",
            posnTarg: new THREE.Vector3(0, 0, 0),
            lookTarg: new THREE.Vector3(0, 0, 0)
        }

        this.#cameraPositions.HANGAR_GUN_SLOT = {
            name: "HANGAR_GUN_SLOT",
            posnTarg: new THREE.Vector3(2, -5, 15),
            lookTarg: new THREE.Vector3(1, -3, 10)
        }

        this.#cameraPositions.ORBIT = {
            name: "ORBIT"
        }

        this.#cameraPositionOrder = ["FOLLOW", "HANGAR", "HANGAR_GUN_SLOT"];

        this.#cameraPosition = this.#cameraPositions.ORIGIN;
    }

    //Sets up curves between different camera cameraPositions
    //naming is always POSITION1_POSITION2 to indicate a curve joining
    //those two positions. Position names must match actual position
    //names.
    #setupCameraTransitionCurves = () => {
        this.#cameraTransitionCurves.ORIGIN_FOLLOW = new THREE.CatmullRomCurve3([
            new THREE.Vector3(0, 0, -5),
        	new THREE.Vector3(0, 3, -20),
        	new THREE.Vector3(0, 7.6, -31.9)
        ]);

        this.#cameraTransitionCurves.FOLLOW_HANGAR = {
            //needs to be implemented
        }

        this.#cameraTransitionCurves.HANGAR_HANGAR_GUN_SLOT = {
            //needs to be implemented
        }

        this.#cameraTransitionCurves.FOLLOW_HANGAR_GUN_SLOT = new THREE.CatmullRomCurve3([
        	new THREE.Vector3(0, 7.6, -31.9),
        	new THREE.Vector3(15, 0, 0),
            new THREE.Vector3(10, -3, 12),
        	new THREE.Vector3(2, -5, 15)
        ]);
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

        cubeW.position.copy(this.#cameraPositions.FOLLOW.lookTarg);
        this._objectGroup.add(cubeW);

        cubeG.position.set(0, 0, 30);
        this._objectGroup.add(cubeG);

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
        if (document.pointerLockElement === window.GameHandler.Renderer.domElement) {
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
        let targetZAngle = this.#baseTargetAngles.z * this.#xPct; // barrel roll
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

    #handleCameraTransition = (dt) => {
        if (this.#cameraTransitioning) {
            this.#cameraTransitionProgress = THREE.MathUtils.lerp(this.#cameraTransitionProgress, 1, (1 + this.#cameraTransitionProgress) * dt);
            this.#cameraTransitionProgress += 0.015 * dt; //minimum amount so it doesn't slow down infinitely

            if (this.#cameraTransitionProgress > 0.9999) {
                this.#cameraTransitionProgress = 1;
            }

            let curvePointPct = this.#cameraTransitionDirection == -1
                ? 1 - this.#cameraTransitionProgress
                : this.#cameraTransitionProgress;

            this.#cameraCurve.getPointAt(curvePointPct, this.#camera.position);

            this.#cameraLookTransition.lerpVectors(this.#oldCameraPosition.lookTarg, this.#cameraPosition.lookTarg, this.#cameraTransitionProgress);

            let lookMatrix = this.#cameraLookMatrix.lookAt(this.#camera.position, this.#cameraLookTransition, UTILS.Constants.upVector);
            this.#camera.quaternion.setFromRotationMatrix(lookMatrix);

            if (this.#cameraTransitionProgress == 1) {
                this.#cameraTransitionProgress = 0;
                this.#cameraTransitioning = false;
            }
        }
        else if (this.#cameraPosition.name == "ORBIT") {
            this.#orbitControls.update();
        }
    }

    #getWorldUpVector = () => {
        return new THREE.Vector3(0, 1, 0).transformDirection(this._objectGroup.matrixWorld);
    }

    //public methods
    Main(dt) {
        super.Main(dt);

        //move forward by current speed
        this.#currentSpeed = THREE.Math.lerp(this.#currentSpeed, this.#targetSpeed, 1.5 * dt);
        this._objectGroup.translateZ(this.#currentSpeed * dt);

        //handle all visual effects associated with current movement
        if (this.#cameraPosition.name != "ORBIT") {
            this.#adjustRotationAmounts(dt);
            this.#adjustPositionOffset(dt);
        }

        this.#handleCameraTransition(dt)
        let keyPressed = window.GameHandler.KeyPressedOnce;
        if (keyPressed.ArrowRight) {
            this.#gunNameIndex = UTILS.Mod(this.#gunNameIndex + 1, this.#gunNames.length);
            this.CurrentGun = this.#gunNames[this.#gunNameIndex];
        }
        else if (keyPressed.ArrowLeft) {
            this.#gunNameIndex = UTILS.Mod(this.#gunNameIndex - 1, this.#gunNames.length);
            this.CurrentGun = this.#gunNames[this.#gunNameIndex];
        }

        this.#debugLine.From = this._objectGroup.position;
        this.#debugLine.To = UTILS.AddVectors(this._objectGroup.position, this.#getWorldUpVector().multiplyScalar(10));
    }

    PostPhysicsCallback(dt) {
        super.PostPhysicsCallback(dt);

        this.FlushForces();
    }

    SetupPointerLock() {
        let canvas = window.GameHandler.Renderer.domElement;
        canvas.requestPointerLock = canvas.requestPointerLock;
        canvas.onclick = canvas.requestPointerLock;

        document.addEventListener("pointerlockchange", (e) => {
            if (document.pointerLockElement === canvas) {
                console.log("Pointer Locked");
            }
            else {
                console.log("Pointer Unlocked");
            }
        }, false);

        document.addEventListener("mousemove", this.#handleMouseMove);

        canvas.requestPointerLock();
    }

    set CameraPosition(positionName) {
        if (positionName != this.#cameraPosition.name) {
            if (this.#cameraPositions[positionName] != undefined) {
                this.#oldCameraPosition = this.#cameraPosition == undefined
                    ? this.#cameraPositions.ORIGIN
                    : this.#cameraPosition;

                this.#cameraPosition = this.#cameraPositions[positionName];

                if (positionName != "ORBIT") {
                    if (this.#oldCameraPosition.name == "ORBIT") {
                        this.#orbitControls.enabled = false;
                        this.#camera.position.copy(this.#cameraPosition.posnTarg);
                        this.#camera.lookAt(this.#cameraPosition.lookTarg);
                    }
                    else {
                        this.#cameraTransitionDirection = 1;
                        this.#cameraCurve = this.#cameraTransitionCurves[`${this.#oldCameraPosition.name}_${this.#cameraPosition.name}`];
                        if (this.#cameraCurve == undefined) {
                            this.#cameraCurve = this.#cameraTransitionCurves[`${this.#cameraPosition.name}_${this.#oldCameraPosition.name}`];
                            this.#cameraTransitionDirection = -1;
                        }

                        this.#cameraTransitioning = true;
                    }
                }
                else {
                    if (this.#orbitControls == undefined) {
                        let canvas = window.GameHandler.Renderer.domElement;
                        this.#orbitControls = new OrbitControls(this.#camera, canvas);
                    }

                    this.#orbitControls.enabled = true;
                }
            }
            else {
                console.log(`"${positionName}" is an invalid camera position name.`);
            }
        }
    }

    set CurrentGun(gunName) {
        if (this.#meshes[gunName] != undefined) {
            this._mainObject.remove(this.#currentGun);
            this.#currentGun = this.#meshes[gunName];
            this._mainObject.add(this.#currentGun);
        }
        else {
            console.log(`"${gunName}" is an invalid gun name`);
        }
    }
}

export default PlayerObject;
