import * as THREE from '../../libraries/three.module.js';
import * as INPUT from '../input.js';
import * as UTILS from '../utils.js';

import GameObject from '../gameobject.js';

class PlayerObject extends GameObject {
    //privates
    #camera;

    #playerGoalOrigin = new THREE.Object3D(); //0, 0, 5
    //#playerGoal = new THREE.Object3D();
    #mainObjectTarget = new THREE.Object3D();

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

    TESTSPEED = 0;
    MAXTESTSPEED = 1000;
    TESTSPEEDACCEL = 50;
    TESTVEL = new THREE.Vector3();

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

        let geo2 = new THREE.BoxGeometry(1, 1, 10);
        window.GameHandler.Scene.add(new THREE.Mesh(geo2, matR));
        //this.#cameraPositions.FOLLOW.posnTarg.add(cube);

        let y = 8;
        this.#cameraPositions.FOLLOW.posnTarg.position.set(0, y-1, -18);
        //this.#cameraPositions.FOLLOW.posnTarg.add(cubeG);
        this.#cameraPositions.FOLLOW.lookTarg.position.set(0, y - 2, 15);
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

        this.#mainObjectTarget.position.copy(this.#playerGoalOrigin.position);
        this.#mainObjectTarget.add(cubeB);

        this._objectGroup.add(this.#playerGoalOrigin);
        this._objectGroup.add(this.#mainObjectTarget);
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
        //this._mainObject.add(this.#camera);

        //move the camera to a point above and behind the player
        //this.#cameraPositionOffset = new THREE.Vector3(0, 7.5, -21);
        //this.#camera.position.copy((UTILS.AddVectors(this._objectGroup.position, this.#cameraPositionOffset)));

        //make the camera look at a point ahead and above the player object
        //WORLD POSITION VERSIONS
        //this.#cameraPositions.FOLLOW.posnTarg.getWorldPosition(this.#camera.position);
        //this.#camera.lookAt(this.#cameraPositions.FOLLOW.lookTarg.getWorldPosition());

        //CAMERA AS CHILD VERSIONS
        //DISABLING TEMPORARILY
        this.#camera.position.copy(this.#cameraPositions.FOLLOW.posnTarg.position);
        this.#camera.lookAt(this.#cameraPositions.FOLLOW.lookTarg.position);

        this._objectGroup.lookAt(this.#playerGoalOrigin.position);

        this._objectGroup.scale.multiplyScalar(1);

        //this._objectGroup.translateX(10);
        //this._objectGroup.translateY(10);
        //this._objectGroup.translateZ(10);

        //setup mouse events
        window.addEventListener("wheel", this.#handleScroll);
    }

    #handleScroll = (event) => {

        if (this.#scrollDelta == 0) {
            this.#scrollDelta = Math.abs(event.deltaY);
        }

        let scrollTicks = -event.deltaY / this.#scrollDelta;

        /* NORMAL VERSION
        if (scrollTicks > 0 && scrollTicks < 1) { scrollTicks = 1; }
        if (scrollTicks < 0 && scrollTicks > -1) { scrollTicks = -1; }
        else { scrollTicks = Math.round(scrollTicks); }

        let amtToThrust = scrollTicks * this.#thrustStep;

        if (scrollTicks > 0) {
            this.#setCurrentThrustLevel(Math.min(this.#thrustLevel + scrollTicks, this.#maxThrustLevel));
        }
        else {
            this.#setCurrentThrustLevel(Math.max(this.#thrustLevel + scrollTicks, this.#minThrustLevel));
        }
        */

        this.TESTSPEED = Math.min(this.TESTSPEED + scrollTicks * this.TESTSPEEDACCEL, this.MAXTESTSPEED);
    }

    #maxMouseOffset = 1000;//10000;
    //#maxMouseOffsetIncrement;
    //#mousePerfTime = 1000/60;
    //#theta = 0;
    //#rad = 0.0174533;
    #handleMouseMove = (event) => {
        //let delta = performance.now() - this.#mousePerfTime;
        //this.#mousePerfTime += delta;
        //this.#maxMouseOffsetIncrement =
        //console.log(delta);
        if (document.pointerLockElement === this.#canvas) {
            this.#mouseOffset.x += event.movementX;
            this.#mouseOffset.y += event.movementY;
            this.#mouseOffset.clampLength(-this.#maxMouseOffset, this.#maxMouseOffset);
            //console.log(this.#mouseOffset);

            //this.#theta -= event.movementX * this.#rad;

            //this.#mainObjectTarget.position.x = 30 * Math.sin(this.#theta);
            //this.#mainObjectTarget.position.z = 30 * Math.cos(this.#theta);
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

        let xPct = this.#mouseOffset.x / this.#maxMouseOffset;
        let yPct = this.#mouseOffset.y / this.#maxMouseOffset;
        let test = new THREE.Vector2(xPct, yPct).normalize();//.multiplyScalar(15);
        this.#mainObjectTarget.position.x = -xPct; //-test.x;
        this.#mainObjectTarget.position.y = -yPct; //-test.y;
        //var rotateAxis = new THREE.Vector3(/*xPct*/0, xPct/*yPct*/, 0);
        //rotateAxis.normalize();
        //let pctVector = new THREE.Vector2(xPct, yPct);
        //console.log(pctVector.length());
        //this._objectGroup.rotateOnWorldAxis(rotateAxis, pctVector.length() * dt); //diagonal will be faster than up/side, but thats ok for now
        //this._objectGroup.rotateOnWorldAxis(new THREE.Vector3(0, 1, 0), 0.2 * dt);
        //console.log(this._objectGroup.rotation.y);

        //THIS VERSION DOESN'T ALLOW PROPER ROTATION WITH QUATERNIONS
        //this.#mainObjectTarget.position.x = -xPct * 10;
        //this.#mainObjectTarget.position.y = -yPct * 10;

        //Cool angle version, spot on a sphere sorta thing
        let rad = 0.0174533;
        //let minTheta = -120 * rad;
        let maxRad = 90 * rad;

        let theta = maxRad * -xPct;
        let x = 30 * Math.sin(theta);
        let y = 30 * Math.cos(theta);

        //fix this so that x/y lie on cirlce
        //right now its always positive...

        //this.#mainObjectTarget.position.x = x;

        //let gamma = maxRad * -yPct;
        //let y = 30 * Math.sin(gamma);
        //let z2 = 30 * Math.cos(gamma);

        //this.#mainObjectTarget.position.y = y;
        //this.#mainObjectTarget.position.z = z2;
        //this.#mainObjectTarget.position.z = z2;
        //console.log(Math.round(this.#mainObjectTarget.position.y));

        //this._objectGroup.rotateX(-0.001);

        //this.#mainObjectTarget.position.x = x;
        //this.#mainObjectTarget.position.y = y;

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
            this.ApplyForce({ name: "THRUST", vector: new THREE.Vector3(/*-xPct * this.#currentZThrust*/0, 0, this.#currentZThrust) });
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

    //this one uses quaternions
    /*
    //#camLerpAlpha = 1;
    //called after physics handler has applied own forces
    PostPhysicsCallback(dt) {
        super.PostPhysicsCallback(dt);

        //console.log(this.#thrustLevel);

        let xPct = this.#mouseOffset.x / this.#maxMouseOffset;
        let yPct = this.#mouseOffset.y / this.#maxMouseOffset;
        let thrustPct = this.#thrustLevel / this.#maxThrustLevel;

        let camZAdjust = thrustPct > 0
            ? 2 //if thrust > 0
            : thrustPct == 0
                ? 0 //if thrust == 0
                : 3; //if thrust < 0

        //this essentially treats "THRUST" as thrust in the z direction, and
        //mouse displacement as thrust in the x and y directions
        var modifiedTarg = this.#cameraPositions.FOLLOW.posnTarg.position.clone();
        if (this._forces.hasOwnProperty("THRUST")) {
            modifiedTarg.z -= thrustPct * camZAdjust;
        }

        modifiedTarg.x += -xPct * 7;
        modifiedTarg.y += -yPct * 4;

        //DISABLING TEMPORARILY
        this.#camera.position.lerp(modifiedTarg, 0.8 * dt);

        //let upVec = new THREE.Vector3(-xPct * Math.abs(thrustPct), 1, 0); //this makes the ship roll nicely, but it also makes turning left/right go down as a result
        let upVec = new THREE.Vector3(0, 1, 0);
        let test = new THREE.Vector3(0, 1, 0);
        this._objectGroup.localToWorld(upVec);
        this._objectGroup.localToWorld(test);
        test.normalize();
        console.log(test.x.toFixed(8), test.y.toFixed(8), test.z.toFixed(8));
        //this._objectGroup.localToWorld(upVec);
        // let lookMatrix = new THREE.Matrix4().lookAt(this.#mainObjectTarget.position, this._mainObject.position, upVec.normalize());//bleh.normalize());
        //let lookMatrix = new THREE.Matrix4().lookAt(this.#mainObjectTarget.position, this._mainObject.position, upVec.normalize());//bleh.normalize());
        //console.log(this.#mainObjectTarget.position, this._mainObject.position);
        let targetWorldPos = new THREE.Vector3();
        this.#mainObjectTarget.getWorldPosition(targetWorldPos);
        let mainWorldPos = new THREE.Vector3();
        this._mainObject.getWorldPosition(mainWorldPos);
        //console.log(targetWorldPos.clone().sub(mainWorldPos));
        let lookMatrix = new THREE.Matrix4().lookAt(targetWorldPos, mainWorldPos, upVec.sub(this._objectGroup.position).normalize());//bleh.normalize());
        let lookQuaternion = new THREE.Quaternion().setFromRotationMatrix(lookMatrix);

        //this._mainObject.quaternion.slerp(lookQuaternion, 1 * dt)
        this._objectGroup.quaternion.slerp(lookQuaternion, 1 * dt);

        //
        // let lookEuler = new THREE.Euler().setFromRotationMatrix(lookMatrix);
        // let lookEulerAsVec = lookEuler.toVector3();
        // let currRotationAsVec = this._objectGroup.rotation.toVector3();
        // currRotationAsVec.lerp(lookEulerAsVec, 1 * dt);
        // console.log(currRotationAsVec, lookEulerAsVec);
        // this._objectGroup.rotation.setFromVector3(currRotationAsVec);

        //this._objectGroup.rotation.x += yPct * dt;
        //this._objectGroup.rotation.y += -xPct * dt;

        //let e = new THREE.Euler();
        //e.setFromQuaternion(lookQuaternion);
        //console.log(e);

        //this._objectGroup.quaternion.rotateTowards(lookQuaternion, 0.2 * dt);

        // this._mainObject.quaternion.slerp(lookQuaternion, 1 * dt);

        //this kind of works. I think a better solution is that, when this occurs, a pre-set animation should be played
        //to flip the player over and reverse the current offsets (get opposite vector2 and extrapolate scaled pct from them);
        // if (this._objectGroup.quaternion.angleTo(lookQuaternion) < 1.5) {
        //     //at this point, rather than keep rotating (because it will just break...) flip the ship and restart rotation from zero
        //     // console.log(this._objectGroup.quaternion.angleTo(lookQuaternion));
        //     // upVec = new THREE.Vector3(0, -1, 0);
        //     // //this._objectGroup.localToWorld(upVec);
        //     // lookMatrix = new THREE.Matrix4().lookAt(mainWorldPos, targetWorldPos, upVec.normalize());//bleh.normalize());
        //     // lookQuaternion = new THREE.Quaternion().setFromRotationMatrix(lookMatrix);
        //     //this._objectGroup.rotateX(-0.01);
        //     this._objectGroup.quaternion.slerp(lookQuaternion, 1 * dt);
        // }
        // else {
        //     //this._objectGroup.quaternion.slerp(lookQuaternion, 1 * dt);
        //     this._objectGroup.rotation.x += yPct * dt;
        //     this._objectGroup.rotation.y += -xPct * dt;
        // }

        //this._objectGroup.quaternion.rotateTowards(lookQuaternion, 0.5 * dt);

        let camLookTargWorld = new THREE.Vector3();
        this.#cameraPositions.FOLLOW.lookTarg.getWorldPosition(camLookTargWorld); //converting this to use VectorToQuaternion could help prevent stuttering
        //DISABLING TEMPORARILY
        //this.#camera.lookAt(camLookTargWorld);

        //console.log(this.#camera.rotation);
        this.FlushForces();
    }
    */

    // Physics Callback v2
    PostPhysicsCallback(dt) {
        super.PostPhysicsCallback(dt);

        //console.log(this.#thrustLevel);

        let xPct = this.#mouseOffset.x / this.#maxMouseOffset;
        let yPct = this.#mouseOffset.y / this.#maxMouseOffset;
        // let xPct = -this.#mainObjectTarget.position.x;
        // let yPct = -this.#mainObjectTarget.position.y;
        let thrustPct = this.#thrustLevel / this.#maxThrustLevel;

        let camZAdjust = thrustPct > 0
            ? 2 //if thrust > 0
            : thrustPct == 0
                ? 0 //if thrust == 0
                : 3; //if thrust < 0

        let speedPct = this.TESTSPEED / this.MAXTESTSPEED;
        let camMaxZAdjust_S = 5;

        //this essentially treats "THRUST" as thrust in the z direction, and
        //mouse displacement as thrust in the x and y directions
        let modifiedTarg = this.#cameraPositions.FOLLOW.posnTarg.position.clone();
        // if (this._forces.hasOwnProperty("THRUST")) {
        if (speedPct > 0) {
            //modifiedTarg.z -= thrustPct * camZAdjust;
            //console.log(speedPct);
            modifiedTarg.z -= speedPct * camMaxZAdjust_S;
        }

        modifiedTarg.x += -xPct * Math.abs(xPct) * 7;
        modifiedTarg.y += -yPct * Math.abs(yPct) * 4;

        //DISABLING TEMPORARILY
        //this.#camera.position.lerp(modifiedTarg, 0.9 * dt);

        //rotate the axis that has a higher pct first
        //+ve rotation.x rotates forward
        //+ve rotation.y rotates left along x axis
        //+ve rotation.z barrel-rolls clockwise
        //1 * dt is quite fast
        // if (Math.abs(xPct) >= Math.abs(yPct)) {

        this._objectGroup.rotateX((yPct * Math.abs(yPct)) * 0.5 * dt);
        this._objectGroup.rotateY(-(xPct * Math.abs(xPct)) * 0.5 * dt);

            // if (xPct < 0 && yPct < 0) {
            //     //console.log('should barrel roll right');
            //     //console.log(xPct, yPct);
            //     if (window.barrelRollAdjust) {
            //         this._objectGroup.rotateZ(-xPct * 0.1 * dt);//-(xPct * Math.abs(xPct)) * 0.1 * dt);
            //     }
            // }

            //this._objectGroup.rotateY(-(xPct) * dt);
            //this._objectGroup.rotateX((yPct) * dt);
        //    this._objectGroup.rotation.y -= (xPct * Math.abs(xPct)) * dt;
        //    this._objectGroup.rotation.x += (yPct * Math.abs(yPct)) * dt;
        // }
        // else {
        //     this._objectGroup.rotateX((yPct * Math.abs(yPct)) * 0.5 * dt);
        //     this._objectGroup.rotateY(-(xPct * Math.abs(xPct)) * 0.5 * dt);
        // }

        //let upVec = new THREE.Vector3(-xPct * Math.abs(thrustPct), 1, 0); //this makes the ship roll nicely, but it also makes turning left/right go down as a result
        let upVec = new THREE.Vector3(0, 1, 0);
        let test = new THREE.Vector3(0, 1, 0);
        this._objectGroup.localToWorld(upVec);
        this._objectGroup.localToWorld(test);
        test.normalize();
        //console.log(test.x.toFixed(8), test.y.toFixed(8), test.z.toFixed(8));
        //this._objectGroup.localToWorld(upVec);
        // let lookMatrix = new THREE.Matrix4().lookAt(this.#mainObjectTarget.position, this._mainObject.position, upVec.normalize());//bleh.normalize());
        //let lookMatrix = new THREE.Matrix4().lookAt(this.#mainObjectTarget.position, this._mainObject.position, upVec.normalize());//bleh.normalize());
        //console.log(this.#mainObjectTarget.position, this._mainObject.position);
        let targetWorldPos = new THREE.Vector3();
        this.#mainObjectTarget.getWorldPosition(targetWorldPos);
        let mainWorldPos = new THREE.Vector3();
        this._mainObject.getWorldPosition(mainWorldPos);
        //console.log(targetWorldPos.clone().sub(mainWorldPos));
        let lookMatrix = new THREE.Matrix4().lookAt(targetWorldPos, mainWorldPos, upVec.sub(this._objectGroup.position).normalize());//bleh.normalize());
        let lookQuaternion = new THREE.Quaternion().setFromRotationMatrix(lookMatrix);

        //this._mainObject.quaternion.slerp(lookQuaternion, 1 * dt)
        //this._objectGroup.quaternion.slerp(lookQuaternion, 1 * dt);

        //
        // let lookEuler = new THREE.Euler().setFromRotationMatrix(lookMatrix);
        // let lookEulerAsVec = lookEuler.toVector3();
        // let currRotationAsVec = this._objectGroup.rotation.toVector3();
        // currRotationAsVec.lerp(lookEulerAsVec, 1 * dt);
        // console.log(currRotationAsVec, lookEulerAsVec);
        // this._objectGroup.rotation.setFromVector3(currRotationAsVec);

        //this._objectGroup.rotation.x += yPct * dt;
        //this._objectGroup.rotation.y += -xPct * dt;

        //let e = new THREE.Euler();
        //e.setFromQuaternion(lookQuaternion);
        //console.log(e);

        //this._objectGroup.quaternion.rotateTowards(lookQuaternion, 0.2 * dt);

        // this._mainObject.quaternion.slerp(lookQuaternion, 1 * dt);

        //this kind of works. I think a better solution is that, when this occurs, a pre-set animation should be played
        //to flip the player over and reverse the current offsets (get opposite vector2 and extrapolate scaled pct from them);
        // if (this._objectGroup.quaternion.angleTo(lookQuaternion) < 1.5) {
        //     //at this point, rather than keep rotating (because it will just break...) flip the ship and restart rotation from zero
        //     // console.log(this._objectGroup.quaternion.angleTo(lookQuaternion));
        //     // upVec = new THREE.Vector3(0, -1, 0);
        //     // //this._objectGroup.localToWorld(upVec);
        //     // lookMatrix = new THREE.Matrix4().lookAt(mainWorldPos, targetWorldPos, upVec.normalize());//bleh.normalize());
        //     // lookQuaternion = new THREE.Quaternion().setFromRotationMatrix(lookMatrix);
        //     //this._objectGroup.rotateX(-0.01);
        //     this._objectGroup.quaternion.slerp(lookQuaternion, 1 * dt);
        // }
        // else {
        //     //this._objectGroup.quaternion.slerp(lookQuaternion, 1 * dt);
        //     this._objectGroup.rotation.x += yPct * dt;
        //     this._objectGroup.rotation.y += -xPct * dt;
        // }

        //this._objectGroup.quaternion.rotateTowards(lookQuaternion, 0.5 * dt);

        let camLookTargWorld = new THREE.Vector3();
        this.#cameraPositions.FOLLOW.lookTarg.getWorldPosition(camLookTargWorld); //converting this to use VectorToQuaternion could help prevent stuttering
        //DISABLING TEMPORARILY
        //this.#camera.lookAt(camLookTargWorld);

        //console.log(this.#camera.rotation);
        this.FlushForces();
    }
}

export default PlayerObject;
