import * as THREE from '../../libraries/three.module.js';
import * as INPUT from '../input.js';
import * as UTILS from '../utils.js';

import GameObject from '../gameobject.js';

import { OrbitControls } from '../../libraries/OrbitControls.js';
import { ThrusterParticleSystemLocalPos } from '../particlesystems/thrusterparticlesystem.js';
import { Gun } from '../gun.js';

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
    #maxSpeed = 500;
    #targetSpeedAccel = 25;

    //mouse vars
    #scrollDelta = 0;
    #mouseOffset = new THREE.Vector2();
    #maxMouseOffset = 1000;
    #mouseOffsetPct = new THREE.Vector2();
    
    //rotation vars
    #baseTargetAngles = {
        x: UTILS.Constants.degToRad * 10,
        y: UTILS.Constants.degToRad * 10,
        z: UTILS.Constants.degToRad * 35
    };
    #targetEuler = new THREE.Euler();
    #targetQuaternion = new THREE.Quaternion();
    #rotAmt = new THREE.Vector2();
    
    //equipment vars
    #currentGun;
    #currentGunObject;
    #gunNames = ["gattling_gun", "rail_gun"];
    #gunNameIndex = 0;
    
    //thrusters
    #leftThrusterParticleSystem;
    #rightThrusterParticleSystem;
    #rightThrusterTarget = new THREE.Object3D();
    #leftThrusterTarget = new THREE.Object3D();

    //general
    #meshes;
    #crosshairSprites = {};
    #crosshairOrigin = new THREE.Vector3(0, 3, 0);
    #crosshairHitMarkerVisibility = false;
    
    //debug
    #debugLine = new UTILS.RedDebugLine();

    constructor(meshes, camera) {
        super(meshes.ship);

        this._mass = 10;

        this.#meshes = meshes;
        this.#meshes.ship.scale.multiplyScalar(0.5)
        this.#meshes.gattling_gun.scale.multiplyScalar(0.1);
        this.#meshes.rail_gun.scale.multiplyScalar(0.1);
        
        let gattlingGunGroup = new THREE.Group();
        gattlingGunGroup.add(this.#meshes.gattling_gun_new.base_plate);
        gattlingGunGroup.add(this.#meshes.gattling_gun_new.struts);
        gattlingGunGroup.add(this.#meshes.gattling_gun_new.barrel);
        gattlingGunGroup.scale.multiplyScalar(0.1);
        gattlingGunGroup.position.set(0, -1.88, 4.29);
        gattlingGunGroup.quaternion.set(0.052475886136, 0, 0, 0.998622191509004);
        console.log(gattlingGunGroup);
        // this.#meshes.gattling_gun_new.base_plate.scale.multiplyScalar(0.1);
        // this.#meshes.gattling_gun_new.struts.scale.multiplyScalar(0.1);
        // this.#meshes.gattling_gun_new.barrel.scale.multiplyScalar(0.1);

        this.#setupCameraPositions();
        this.#setupCameraTransitionCurves();

        this.#setupDebugHelpers();
        this.#setupThrusters();
        this.#setupCrosshair();

        this.#camera = camera;
        this._objectGroup.add(this.#camera);
        // this.CameraPosition = "FOLLOW";
        this.CameraPosition = "ORBIT";

        
        let randomCubeGeo = new THREE.BoxGeometry(0.2, 0.2, 0.2);
        let randomCubeMat = new THREE.MeshPhongMaterial({ color: 0x00ffff, shininess: 100 });
        let randomCube = new THREE.Mesh(randomCubeGeo, randomCubeMat);

        //this.CurrentGun = this.#gunNames[this.#gunNameIndex];
        // this.#currentGun = new Gun(this.#currentGunObject, randomCube, 2000, 10, 0.5);

        this.#currentGunObject = gattlingGunGroup;
        this._mainObject.add(this.#currentGunObject);
        this.#currentGun = new Gun(this.#currentGunObject, randomCube, 2000, 10, 0.5);

        window.addEventListener("wheel", this.#handleScroll);
    }

    #setupCameraPositions = () => {
        this.#cameraPositions.ORIGIN = {
            name: "ORIGIN",
            posnTarg: new THREE.Vector3(0, 0, -5),
            lookTarg: new THREE.Vector3()
        }

        this.#cameraPositions.FOLLOW = {
            name: "FOLLOW",
            posnTarg: new THREE.Vector3(0, 3.8, -15.95),
            lookTarg: new THREE.Vector3(0, 7.75, 7.5)
        }

        this.#cameraPositions.HANGAR = {
            name: "HANGAR",
            posnTarg: new THREE.Vector3(),
            lookTarg: new THREE.Vector3()
        }

        this.#cameraPositions.HANGAR_GUN_SLOT = {
            name: "HANGAR_GUN_SLOT",
            posnTarg: new THREE.Vector3(1, -2.5, 7.5),
            lookTarg: new THREE.Vector3(0.5, -1.5, 5)
        }

        this.#cameraPositions.ORBIT = {
            name: "ORBIT",
            posnTarg: new THREE.Vector3(0, 0, -5),
            lookTarg: new THREE.Vector3()
        }

        this.#cameraPositionOrder = ["FOLLOW", "HANGAR", "HANGAR_GUN_SLOT"];

        this.#cameraPosition = this.#cameraPositions.ORIGIN;
    }

    /**
     * Sets up curves between different camera cameraPositions
     * naming is always POSITION1_POSITION2 to indicate a curve joining
     * those two positions. Position names must match actual position
     * names.
     */
    #setupCameraTransitionCurves = () => {
        this.#cameraTransitionCurves.ORIGIN_FOLLOW = new THREE.CatmullRomCurve3([
            this.#cameraPositions.ORIGIN.posnTarg,
        	new THREE.Vector3(0, 1.5, -10),
        	this.#cameraPositions.FOLLOW.posnTarg
        ]);

        this.#cameraTransitionCurves.FOLLOW_HANGAR = {
            //needs to be implemented
        }

        this.#cameraTransitionCurves.HANGAR_HANGAR_GUN_SLOT = {
            //needs to be implemented
        }

        this.#cameraTransitionCurves.FOLLOW_HANGAR_GUN_SLOT = new THREE.CatmullRomCurve3([
        	this.#cameraPositions.FOLLOW.posnTarg,
        	new THREE.Vector3(7.5, 0, 0),
            new THREE.Vector3(5, -1.5, 6),
        	this.#cameraPositions.HANGAR_GUN_SLOT.posnTarg
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

        // cubeW.position.copy(this.#cameraPositions.FOLLOW.lookTarg);
        // this._objectGroup.add(cubeW);

        // cubeG.position.set(0, 0, 30);
        // this._objectGroup.add(cubeG);
    }

    get Testing(){ return this.#leftThrusterTarget.getWorldPosition(new THREE.Vector3()); }

    #setupThrusters = () => {
        this.#rightThrusterTarget.position.set(-2.8, 2.48, -8.74);
        this._mainObject.add(this.#rightThrusterTarget);

        this.#leftThrusterTarget.position.set(2.8, 2.48, -8.74);
        this._mainObject.add(this.#leftThrusterTarget);

        let extraOptions = {
            velSpread: new THREE.Vector3(5, 5, 0),
            originSpread: new THREE.Vector3(0.5, 0, 0)
        };

        this.#leftThrusterParticleSystem = new ThrusterParticleSystemLocalPos(
            this.#leftThrusterTarget,
            new THREE.Vector3(-0.05, 0, -1),
            0.2,
            1000,
            1.75,
            extraOptions
        );

        this.#rightThrusterParticleSystem = new ThrusterParticleSystemLocalPos(
            this.#rightThrusterTarget,
            new THREE.Vector3(0.05, 0, -1),
            0.2,
            1000,
            1.75,
            extraOptions
        );
    }

    #setupCrosshair = () => {
        let loadedImages = window.GameHandler.AssetHandler.LoadedImages;

        //setup sprite extraction method
        let createSpritesFromTextures = (obj) => {
            for (let key in obj) {
                let texture = obj[key];
                let material = new THREE.SpriteMaterial({ map: texture, sizeAttenuation: false, depthWrite: false, depthTest: false });
                if (key.startsWith("sometimes/")) {
                    //sprites that are sometimes visible should have transparent set to true and be invisible initially
                    material.transparent = true;
                    material.opacity = 0;
                }

                this.#crosshairSprites[key] = new THREE.Sprite(material)
            }
        }

        //create the mobile and stationary sprites from the textures
        createSpritesFromTextures(loadedImages.crosshairMobile);
        createSpritesFromTextures(loadedImages.crosshairStationary);

        //add the sprites to the group object and scale them
        for (let key in this.#crosshairSprites) {
            let sprite = this.#crosshairSprites[key];
            sprite.scale.set(0.05, 0.05, 0.05);
            this._objectGroup.add(sprite);
        }
    }

    #handleScroll = (event) => {
        if (!window.GameHandler.IsPaused && event.deltaY != 0) {
            //initialise a scrollDelta so we know how much their mouse wheel is scrolling each time
            if (this.#scrollDelta == 0) {
                this.#scrollDelta = Math.abs(event.deltaY);
            }

            let scrollTicks = -event.deltaY / this.#scrollDelta;

            this.#targetSpeed = Math.min(this.#targetSpeed + scrollTicks * this.#targetSpeedAccel, this.#maxSpeed);
            if (this.#targetSpeed < 0) { this.#targetSpeed = 0; }
            
            this.#leftThrusterParticleSystem.Speed = this.#targetSpeed / this.#targetSpeedAccel * 5;
            this.#rightThrusterParticleSystem.Speed = this.#targetSpeed / this.#targetSpeedAccel * 5;
        }
    }

    #handleMouseMove = (event) => {
        if (!window.GameHandler.IsPaused) {
            if (document.pointerLockElement === window.GameHandler.Renderer.domElement) {
                this.#mouseOffset.x += -event.movementX; //y movement is positive when going right, the reverse of ThreeJS x axis orientation
                this.#mouseOffset.y += -event.movementY; //y movement is positive when going down, the reverse of ThreeJS y axis orientation

                this.#mouseOffset.clampLength(-this.#maxMouseOffset, this.#maxMouseOffset);
            }
        }
    }

    
    #adjustRotationAmounts = (dt) => {
        this.#mouseOffsetPct.set(this.#mouseOffset.x / this.#maxMouseOffset, this.#mouseOffset.y / this.#maxMouseOffset);

        let deltaRotAmt = UTILS.SubVectors(this.#mouseOffsetPct, this.#rotAmt);

        let timePct = Math.sqrt(this.#rotAmt.length());
        let maxMagnitude = (0.6 + timePct) * dt; //0.04 + 2
        this.#rotAmt.add(deltaRotAmt.clampLength(-maxMagnitude, maxMagnitude));

        this._objectGroup.rotateX(-this.#rotAmt.y * dt);
        this._objectGroup.rotateY(this.#rotAmt.x * dt);

        let targetXAngle = this.#baseTargetAngles.x * -this.#mouseOffsetPct.y; // back and forth
        let targetYAngle = this.#baseTargetAngles.y * this.#rotAmt.x; // side to side
        let targetZAngle = this.#baseTargetAngles.z * -this.#mouseOffsetPct.x;//UTILS.LimitMagnitude(-this.#rotAmt.x - deltaRotAmt.x / dt / 2, 1); // barrel roll
        this.#targetEuler.set(targetXAngle, targetYAngle, targetZAngle);
        this.#targetQuaternion.setFromEuler(this.#targetEuler);

        this._mainObject.quaternion.slerp(this.#targetQuaternion, 1.6 * dt);
    }

    #adjustPositionOffset = (dt) => {
        let speedPct = this.#targetSpeed / this.#maxSpeed;
        //this.#debugMouseOffset.position.x = this.#mouseOffsetPct.x * (4 + 8 * speedPct);
        //this.#debugMouseOffset.position.y = this.#mouseOffsetPct.y * (4 + 8 * speedPct);

        let maxCrosshairOffset = 2 + (2 * speedPct);
        this.#crosshairSprites["always/arcs"].position.set(
            this.#crosshairOrigin.x + this.#mouseOffsetPct.x * maxCrosshairOffset,
            this.#crosshairOrigin.y + this.#mouseOffsetPct.y * maxCrosshairOffset,
            this.#crosshairOrigin.z
        );
        
        this.#crosshairSprites["sometimes/bt"].position.copy(this.#crosshairSprites["always/arcs"].position);
        this.#crosshairSprites["sometimes/tl"].position.copy(this.#crosshairSprites["always/arcs"].position);
        this.#crosshairSprites["sometimes/tr"].position.copy(this.#crosshairSprites["always/arcs"].position);
        
        //this.#mainObjectTarget.position.x = this.#rotAmt.x * (4 + 8 * speedPct);
        //this.#mainObjectTarget.position.y = this.#rotAmt.y * (4 + 8 * speedPct);

        this.#crosshairSprites["halo"].position.set(
            this.#crosshairOrigin.x + this.#rotAmt.x * maxCrosshairOffset,
            this.#crosshairOrigin.y + this.#rotAmt.y * maxCrosshairOffset,
            this.#crosshairOrigin.z
        );

        this.#crosshairSprites["rim"].position.copy(this.#crosshairOrigin);

        let modifiedTarg = new THREE.Vector3();

        let xyOffsetPct = 0.2 + (1 - 0.2) * speedPct;
        modifiedTarg.z += 6 * speedPct;
        modifiedTarg.y += 2.5 * -this.#mouseOffsetPct.y * xyOffsetPct + 0.25 * speedPct;
        modifiedTarg.x += 2.5 * -this.#mouseOffsetPct.x * xyOffsetPct;

        this._mainObject.position.lerp(modifiedTarg, 0.9 * dt);
    }

    #handleCameraTransition = (dt) => {
        if (this.#cameraTransitioning) {
            if (this.#cameraCurve) {
                this.#cameraTransitionProgress = THREE.Math.lerp(this.#cameraTransitionProgress, 1, (1 + this.#cameraTransitionProgress) * dt);
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
            else {
                //if no curve was found, just move to the new position
                this.#camera.position.copy(this.#cameraPosition.posnTarg);
                this.#camera.lookAt(this.#cameraPosition.lookTarg);
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
            if (INPUT.KeyPressedOnce("space")) {
                this.#mouseOffset.set(0, 0);
            }
        }

        this.#currentGun.Firing = INPUT.KeyPressed("leftMouse");

        this.#crosshairHitMarkerVisibility = INPUT.KeyPressed("leftMouse")
            ? THREE.MathUtils.lerp(this.#crosshairSprites["sometimes/bt"].material.opacity, 1, 15 * dt)
            : THREE.MathUtils.lerp(this.#crosshairSprites["sometimes/bt"].material.opacity, 0, 5 * dt);

        this.#crosshairSprites["sometimes/bt"].material.opacity = this.#crosshairHitMarkerVisibility;
            this.#crosshairSprites["sometimes/tl"].material.opacity = this.#crosshairHitMarkerVisibility;
            this.#crosshairSprites["sometimes/tr"].material.opacity = this.#crosshairHitMarkerVisibility;

        this.Object.updateWorldMatrix(true, true);
        this.#leftThrusterParticleSystem.Main(dt);
        this.#rightThrusterParticleSystem.Main(dt);

        this.#currentGun.Main(dt);
        
        //this.#debugLine.From = this._objectGroup.position;
        //this.#debugLine.To = UTILS.AddVectors(this._objectGroup.position, this.#getWorldUpVector().multiplyScalar(10));
    }

    MainNoPause(dt) {
        super.MainNoPause(dt);

        this.#handleCameraTransition(dt);

        if (window.GameHandler.IsPaused) {
            if (INPUT.KeyPressedOnce("ArrowRight")) {
                this.#gunNameIndex = UTILS.Mod(this.#gunNameIndex + 1, this.#gunNames.length);
                this.CurrentGun = this.#gunNames[this.#gunNameIndex];
            }
            else if (INPUT.KeyPressedOnce("ArrowLeft")) {
                this.#gunNameIndex = UTILS.Mod(this.#gunNameIndex - 1, this.#gunNames.length);
                this.CurrentGun = this.#gunNames[this.#gunNameIndex];
            }

            this.#crosshairSprites["always/arcs"].material.opacity = 0;
            this.#crosshairSprites["sometimes/bt"].material.opacity = 0;
            this.#crosshairSprites["sometimes/tl"].material.opacity = 0;
            this.#crosshairSprites["sometimes/tr"].material.opacity = 0;
            this.#crosshairSprites["halo"].material.opacity = 0;
            this.#crosshairSprites["rim"].material.opacity = 0;
        }
        else {
            this.#crosshairSprites["always/arcs"].material.opacity = 1;
            this.#crosshairSprites["halo"].material.opacity = 1;
            this.#crosshairSprites["rim"].material.opacity = 1;
        }

        let moveVec = new THREE.Vector3();
        let rotVec = new THREE.Vector3();
        if (INPUT.KeyPressed("w")) {
            moveVec.z = 0.1;
        }
        if (INPUT.KeyPressed("a")) {
            moveVec.x = 0.1;
        }
        if (INPUT.KeyPressed("s")) {
            moveVec.z = -0.1;
        }
        if (INPUT.KeyPressed("d")) {
            moveVec.x = -0.1;
        }
        if (INPUT.KeyPressed("r")) {
            moveVec.y = 0.1;
        }
        if (INPUT.KeyPressed("f")) {
            moveVec.y = -0.1;
        }
        if (INPUT.KeyPressed("t")) {
            rotVec.x = 0.05;
        }
        if (INPUT.KeyPressed("g")) {
            rotVec.x = -0.05;
        }
        if (INPUT.KeyPressed("ShiftLeft")) {
            moveVec.multiplyScalar(0.1);
            rotVec.multiplyScalar(0.1);
        }

        //console.log(moveVec);
        this.#currentGunObject.position.add(moveVec);
        this.#currentGunObject.rotateX(rotVec.x);
    }

    PostPhysicsCallback(dt) {
        super.PostPhysicsCallback(dt);

        this.FlushForces();
    }

    SetupPointerLock() {
        let canvas = window.GameHandler.Renderer.domElement;
        canvas.requestPointerLock = canvas.requestPointerLock;
        canvas.onclick = () => {
            if (!window.GameHandler.IsPaused) {
                canvas.requestPointerLock();
            }
        }

        document.addEventListener("pointerlockchange", (e) => {
            if (document.pointerLockElement === canvas) {
                // console.log("Pointer Locked");
            }
            else {
                // console.log("Pointer Unlocked");
            }
        }, false);

        document.addEventListener("mousemove", this.#handleMouseMove);

        canvas.requestPointerLock();
    }

    get CameraPosition() { return this.#cameraPosition; }

    /**
     * @param {string} positionName
     */
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

                    this.#cameraCurve = undefined;
                    this.#cameraTransitioning = true;
                    this.#orbitControls.enabled = true;
                }
            }
            else {
                console.log(`"${positionName}" is an invalid camera position name.`);
            }
        }
    }

    /**
     * @param {string} gunName
     */
    set CurrentGun(gunName) {
        if (this.#meshes[gunName] != undefined) {
            this._mainObject.remove(this.#currentGunObject);
            this.#currentGunObject = this.#meshes[gunName];
            this._mainObject.add(this.#currentGunObject);
        }
        else {
            console.log(`"${gunName}" is an invalid gun name`);
        }
    }
}

export default PlayerObject;
