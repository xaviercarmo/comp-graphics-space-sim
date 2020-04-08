import * as THREE from '../../libraries/three.module.js';
import * as INPUT from '../input.js';
import * as UTILS from '../utils.js';

import GameObject from '../gameobject.js';

class PlayerObject extends GameObject {
    //privates
    #camera;

    #playerGoalOrigin = new THREE.Object3D(); //0, 0, 5
    //#playerGoal = new THREE.Object3D();
    #aTestThatWillWork = new THREE.Object3D();

    #cameraPositions = {};
    #cameraCurrentLookVec = new THREE.Vector3();
    #cameraCurrentPosnVec = new THREE.Vector3();

    //used so that maneuvers and shake effects don't affect the camera
    //also the point to which the player object will return (through
    //fake gravity) after performing a maneuver
    //#trueCentre = new THREE.Vector3;

    #forces = {
        F_THRUST: { name: "F_THRUST", vector: new THREE.Vector3(0, 0, 250) },
        B_THRUST: { name: "B_THRUST", vector: new THREE.Vector3(0, 0, -250) }
    }
    //#currentThrustForce = new THREE.Vector3(0, 0, 0);
    #currentZThrust = 0;
    //#maxThrustForce = 450;
    #thrustStep = 50;
    #thrustLevel = 0;
    #maxThrustLevel = 9;
    #minThrustLevel = -9;
    #scrollDelta = 0;
    #brakeThrustApplied = false;

    #canvas;

    #mouseOffset = new THREE.Vector2();

    constructor(object, camera) {
        super(object);

        this._mass = 10;

        //set up the camera positions so that they are chidren of the
        //player object
        this.#cameraPositions.FOLLOW = {
            posnTarg: new THREE.Object3D(),
            lookTarg: new THREE.Object3D()
        }

        let geo = new THREE.BoxGeometry(1, 1, 1);
        let matR = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        let matG = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
        let matB = new THREE.MeshBasicMaterial({ color: 0x0000ff });
        let matW = new THREE.MeshBasicMaterial({ color: 0xffffff });
        let cubeR = new THREE.Mesh(geo, matR);
        let cubeG = new THREE.Mesh(geo, matG);
        let cubeB = new THREE.Mesh(geo, matB);
        let cubeW = new THREE.Mesh(geo, matW);
        //this.#cameraPositions.FOLLOW.posnTarg.add(cube);

        let y = 7;
        this.#cameraPositions.FOLLOW.posnTarg.position.set(0, y, -25);
        this.#cameraPositions.FOLLOW.posnTarg.add(cubeG);
        this.#cameraPositions.FOLLOW.lookTarg.position.set(0, y, 15);
        this.#cameraPositions.FOLLOW.lookTarg.add(cubeW);
        this._objectGroup.add(this.#cameraPositions.FOLLOW.posnTarg);
        this._objectGroup.add(this.#cameraPositions.FOLLOW.lookTarg);

        // geo = new THREE.BoxGeometry(10, 10, 1);
        // mat = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
        // cube = new THREE.Mesh(geo, mat);
        //this._objectGroup.add(this.#playerGoal);
        //this._objectGroup.add(this.#playerGoalOrigin);
        //this.#playerGoal.position.set(0, 0, 20);
        //this.#playerGoal.add(cubeG);

        //this.#playerGoalOrigin.position.copy(this.#playerGoal.position);
        this.#playerGoalOrigin.position.set(0, 0, 30);
        this.#playerGoalOrigin.add(cubeR);

        this.#aTestThatWillWork.position.copy(this.#playerGoalOrigin.position);
        this.#aTestThatWillWork.add(cubeB);

        this._objectGroup.add(this.#playerGoalOrigin);
        this._objectGroup.add(this.#aTestThatWillWork);
        //window.GameHandler.Scene.add(this.#playerGoal);

        console.log(this._objectGroup.position);
        //console.log(this.#playerGoal.getWorldPosition());
        //this._objectGroup.lookAt(this.#playerGoal.position);
        //this._objectGroup.add(cube);
        //cube.position.y += 3;

        //this.#trueCentre.copy(this._objectGroup.position);

        this.#camera = camera;

        //DISABLING THIS TEMPORARILY WHILE DOING TESTING FOR ROTATION
        this._objectGroup.add(this.#camera);

        //move the camera to a point above and behind the player
        //this.#cameraPositionOffset = new THREE.Vector3(0, 7.5, -21);
        //this.#camera.position.copy((UTILS.AddVectors(this._objectGroup.position, this.#cameraPositionOffset)));

        //make the camera look at a point ahead and above the player object
        //WORLD POSITION VERSIONS
        //this.#cameraPositions.FOLLOW.posnTarg.getWorldPosition(this.#camera.position);
        //this.#camera.lookAt(this.#cameraPositions.FOLLOW.lookTarg.getWorldPosition());

        //CAMERA AS CHILD VERSIONS
        this.#camera.position.copy(this.#cameraPositions.FOLLOW.posnTarg.position);
        this.#camera.lookAt(this.#cameraPositions.FOLLOW.lookTarg.position);

        this._objectGroup.lookAt(this.#playerGoalOrigin.position);

        this._objectGroup.scale.multiplyScalar(1);

        //setup mouse events
        window.addEventListener("wheel", this.#handleScroll);
    }

    #handleScroll = (event) => {
        if (this.#scrollDelta == 0) {
            this.#scrollDelta = Math.abs(event.deltaY);
        }

        let scrollTicks = -event.deltaY / this.#scrollDelta;

        if (scrollTicks > 0 && scrollTicks < 1) { scrollTicks = 1; }
        if (scrollTicks < 0 && scrollTicks > -1) { scrollTicks = -1; }
        else { scrollTicks = Math.round(scrollTicks); }

        let amtToThrust = scrollTicks * this.#thrustStep;

        //direction of the ship is determined by where the goal is, so only ever need
        //to thrust "forward" toward the goal
        //console.log(amtToThrust);
        if (scrollTicks > 0) {
            // this.#currentThrustForce.z = Math.min(this.#currentThrustForce.z + amtToThrust, this.#maxThrustForce);
            // this.#currentZThrust = Math.min(this.#currentZThrust + amtToThrust, this.#maxThrustForce);
            this.#setCurrentThrustLevel(Math.min(this.#thrustLevel + scrollTicks, this.#maxThrustLevel));
            //this.#currentZThrust = Math.min(this.#currentZThrust + amtToThrust, this.#maxThrustForce);
        }
        else {
            // this.#currentThrustForce.z = Math.max(this.#currentThrustForce.z + amtToThrust, -this.#maxThrustForce);//-(this.#thrustStep * 3));
            //this.#currentZThrust = Math.max(this.#currentZThrust + amtToThrust, -this.#maxThrustForce);//-(this.#thrustStep * 3));
            this.#setCurrentThrustLevel(Math.max(this.#thrustLevel + scrollTicks, this.#minThrustLevel));
        }

        // this.#thrustLevel = this.#currentThrustForce.z / this.#thrustStep;
        //this.#thrustLevel = this.#currentZThrust / this.#thrustStep;

        //this.#currentThrustForce.z = Math.max(this.#currentThrustForce.z, 0);
        //this.ApplyForce({ name: "THRUST", vector: this.#currentThrustForce });
    }

    #maxMouseOffset = 150;
    #handleMouseMove = (event) => {
        if (document.pointerLockElement === this.#canvas) {
            this.#mouseOffset.x += event.movementX;
            this.#mouseOffset.y += event.movementY;
            this.#mouseOffset.clampLength(-this.#maxMouseOffset, this.#maxMouseOffset);
            //console.log(this.#mouseOffset);
        }
    }

    //private methods
    #applyOwnForces = (dt) => {
        // if (this.#currentThrustForce.z != 0) {

        // if (INPUT.KeyPressed.w) {
        //     //this._objectGroup.position.z += 0.2;
        //     this.ApplyForce(this.#forces.F_THRUST);
        // }
        // if (INPUT.KeyPressed.s) {
        //     // this._objectGroup.position.z -= 0.2;
        //     this.ApplyForce(this.#forces.B_THRUST);
        // }

        // if (INPUT.KeyPressed.a) {
        //     this._objectGroup.rotation.y += 0.005;
        // }
        // if (INPUT.KeyPressed.d) {
        //     this._objectGroup.rotation.y -= 0.005;
        // }
        //

        // this.#playerGoal.position.y = -this.#mouseOffset.y / 10;
        // this.#playerGoal.position.y = -this.#mouseOffset.y / 10;

        this.#aTestThatWillWork.position.x = -this.#mouseOffset.x / 10;
        this.#aTestThatWillWork.position.y = -this.#mouseOffset.y / 10;

        let rot = false
        if (INPUT.KeyPressed.w) { //&& this.#playerGoal.position.y < 20) {
            //this.#playerGoal.position.y += 10 * dt;
            //this._objectGroup.position.y += 1 * dt;
            //console.log(this._objectGroup.position, this.#playerGoal.getWorldPosition());
            //rot = true;
            //this._objectGroup.rotation.y += 1 * dt;
        }

        if (INPUT.KeyPressed.s) {
            //this.#playerGoal.position.y -= 10 * dt;
        }

        if (!rot) {
            //this.#playerGoal.position.lerp(this.#playerGoalOrigin.position, 1.6 * dt);
        }
        //console.log(this.#playerGoal.position);

        if (INPUT.KeyPressed.space && this.Velocity.z > 0) {
            //this.#thrustLevel = -9;
            // this.#currentThrustForce.z = this.#thrustLevel * this.#thrustStep;
            //this.#currentZThrust = this.#thrustLevel * this.#thrustStep;
            this.#setCurrentThrustLevel(this.#minThrustLevel);
            // this.ApplyForce({ name: "THRUST", vector: this.#currentThrustForce });
            //this.ApplyForce({ name: "THRUST", vector: new THREE.Vector3(0, 0, this.#currentZThrust) });
            this.#brakeThrustApplied = true;
        }
        else if (this.#brakeThrustApplied) {
            if (this.Velocity.z < 0) { this.Velocity.z = 0; };
            this.#brakeThrustApplied = false;
            this.#setCurrentThrustLevel(0);
        }

        if (this.#currentZThrust != 0) {
            // this.ApplyForce({ name: "THRUST", vector: this.#currentThrustForce });
            this.ApplyForce({ name: "THRUST", vector: new THREE.Vector3(0, 0, this.#currentZThrust) });
        }
        // if (INPUT.KeyPressed.shift) {
        //     this._objectGroup.position.y -= 0.2;
        // }

        // if (INPUT.KeyPressed.l) {
        //     this.#camera.lookAt(this._objectGroup.position);
        // }
        //
        // if (INPUT.KeyPressed.r) {
        //     this._objectGroup.rotation.x -= 0.005;
        // }
        // if (INPUT.KeyPressed.f) {
        //     this._objectGroup.rotation.x += 0.005;
        // }
    }

    #setCurrentThrustLevel = (value) => {
        if (value >= this.#minThrustLevel && value <= this.#maxThrustLevel && Number.isInteger(value)) {
            this.#thrustLevel = value;
            this.#currentZThrust = this.#thrustLevel * this.#thrustStep;
        }
        else {
            console.log("invalid thrust level value: ", value);
        }
    }

    //public methods
    Main(dt) {
        //console.log(this.#camera.position.z == this.#camera.position.clone().z);
        //console.log(this.#cameraPositions.FOLLOW.posnTarg.getWorldPosition(test).z - this.#camera.position.z);
        super.Main(dt);
        this.#applyOwnForces(dt);
        // if (INPUT.KeyPressed.w) {
        //     this._objectGroup.position.z += 0.2;
        // }
        // if (INPUT.KeyPressed.s) {
        //     this._objectGroup.position.z -= 0.2;
        // }
        //
        // if (INPUT.KeyPressed.a) {
        //     this._objectGroup.rotation.y += 0.005;
        // }
        // if (INPUT.KeyPressed.d) {
        //     this._objectGroup.rotation.y -= 0.005;
        // }
        //
        // if (INPUT.KeyPressed.space) {
        //     this._objectGroup.position.y += 0.2;
        // }
        // if (INPUT.KeyPressed.shift) {
        //     this._objectGroup.position.y -= 0.2;
        // }
        //
        // if (INPUT.KeyPressed.l) {
        //     this.#camera.lookAt(this._objectGroup.position);
        // }
        //
        // if (INPUT.KeyPressed.r) {
        //     this._objectGroup.rotation.x -= 0.005;
        // }
        // if (INPUT.KeyPressed.f) {
        //     this._objectGroup.rotation.x += 0.005;
        // }

        //this must be done BEFORE any movement effects that shouldn't affect the camera are applied
        //this.#trueCentre.copy(this._objectGroup.position);

        //this.#camera.position.copy((UTILS.AddVectors(this._objectGroup.position, new THREE.Vector3(0, 7.5, -21))));
        //this.#camera.position.lerp(UTILS.AddVectors(this._objectGroup.position, new THREE.Vector3(0, 7.5, -21)), 0.1);
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

    //#camLerpAlpha = 1;
    //called after physics handler has applied own forces
    PostPhysicsCallback(dt) {
        super.PostPhysicsCallback(dt);

        //console.log(this.#thrustLevel);

        let xPct = this.#mouseOffset.x / this.#maxMouseOffset;
        let yPct = this.#mouseOffset.y / this.#maxMouseOffset;

        if (this._forces.hasOwnProperty("THRUST")) {
            let thrustPct = this.#thrustLevel > 0
                ? this.#thrustLevel / this.#maxThrustLevel
                : -this.#thrustLevel / this.#minThrustLevel;

            let camZAdjust = thrustPct > 0
                ? 7
                : 3

            var modifiedTarg = this.#cameraPositions.FOLLOW.posnTarg.position.clone();
            modifiedTarg.z -= thrustPct * camZAdjust;
            modifiedTarg.x += -xPct * 15;
            modifiedTarg.y += -yPct * 15;
            //DISABLING THIS TEMPORARILY WHILE DOING TESTING FOR ROTATION
            this.#camera.position.lerp(modifiedTarg, 0.8 * dt);
        }
        else {
            //DISABLING THIS TEMPORARILY WHILE DOING TESTING FOR ROTATION
            this.#camera.position.lerp(this.#cameraPositions.FOLLOW.posnTarg.position, 0.8 * dt);
        }

        let upVec = new THREE.Vector3(-xPct, 1, 0);
        let lookMatrix = new THREE.Matrix4().lookAt(this.#aTestThatWillWork.position, this._mainObject.position, upVec.normalize());//bleh.normalize());
        let lookQuaternion = new THREE.Quaternion().setFromRotationMatrix(lookMatrix);

        //let e = new THREE.Euler();
        //e.setFromQuaternion(lookQuaternion);
        //console.log(e);

        //this._objectGroup.quaternion.rotateTowards(lookQuaternion, 0.2 * dt);
        this._objectGroup.quaternion.slerp(lookQuaternion, 1 * dt);
        //console.log(this._objectGroup.quaternion.angleTo(lookQuaternion));

        //this.#camera.quaternion.slerp(lookQuaternion, 0.2 * dt);
        let camLookTargWorld = new THREE.Vector3();
        this.#cameraPositions.FOLLOW.lookTarg.getWorldPosition(camLookTargWorld);
        this.#camera.lookAt(camLookTargWorld);
        //console.log(this.#camera.rotation);
        this.FlushForces();
    }
}

export default PlayerObject;
