import * as THREE from '../../../libraries/three.module.js';
import * as INPUT from '../../input.js';
import * as UTILS from '../../utils.js';

import PhysicsObject from '../physics.js';

import { OrbitControls } from '../../../libraries/OrbitControls.js';
import { ThrusterParticleSystemLocalPos } from '../../particlesystems/thrusterparticlesystem.js';
import { Gun } from '../../gun.js';

class PlayerObject extends PhysicsObject {
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
    #currentGunBarrelGroup;
    #gunNames = ["gattling_gun", "rail_gun"];
    #gunNameIndex = 0;
    
    //thrusters
    _lightThrusters = {};
    _mediumThrusters = {
        left: {
            system: undefined,
            target: new THREE.Object3D()
        },
        mid_left: {
            system: undefined,
            target: new THREE.Object3D()
        },
        mid_mid: {
            system: undefined,
            target: new THREE.Object3D()
        },
        mid_right: {
            system: undefined,
            target: new THREE.Object3D()
        },
        right: {
            system: undefined,
            target: new THREE.Object3D()
        }
    };
    _heavyThrusters = {
        top_left: {
            system: undefined,
            target: new THREE.Object3D()
        },
        top_right: {
            system: undefined,
            target: new THREE.Object3D()
        },
        bottom_left: {
            system: undefined,
            target: new THREE.Object3D()
        },
        bottom_right: {
            system: undefined,
            target: new THREE.Object3D()
        }
    };
    #currentThrusters;

    //thruster lights
    #thrusterLights = {
        left: {
            light_position: new THREE.Vector3(2.8, 2.48, -11),
            medium_position: new THREE.Vector3(2.8, 2.48, -11),
            heavy_position: new THREE.Vector3(2.8, 2.48, -11),
            light: new THREE.PointLight(0xff1000, 0, 10)
        },
        right: {
            light_position: new THREE.Vector3(-2.8, 2.48, -11),
            medium_position: new THREE.Vector3(-2.8, 2.48, -11),
            heavy_position: new THREE.Vector3(-2.8, 2.48, -11),
            light: new THREE.PointLight(0xff1000, 0, 10)
        }
    };

    //general
    #meshes;
    #textures;
    #crosshairSprites = {};
    #crosshairOrigin = new THREE.Vector3(0, 3, 0);

    //classes
    #classes = {
        LIGHT: 'light',
        MEDIUM: 'medium',
        HEAVY: 'heavy'
    };
    #currentClass = this.#classes.HEAVY;

    //appearance
    #shipShaders = {};
    #shipHue = 0.08;

    //debug
    //#debugLine = new UTILS.RedDebugLine();

    constructor(assets, camera) {
        super(assets.meshes.heavy_ship);

        this.#meshes = assets.meshes;
        this.#textures = assets.textures;

        this.#setupShipClasses();

        this.Class = "HEAVY";
        // later this setup will be moved to the class setter and all that will be needed is the above call
        // to set the default class
        this.#setupShipThrusters();

        this.#setupCameraPositions();
        this.#setupCameraTransitionCurves();
        this.#setupCamera(camera);

        this.#setupCrosshair();
        
        this.#setupGunModels();
        this.#setupGun();

        window.addEventListener("wheel", this.#handleScroll);
    }

    #setupCamera = (camera) => {
        this.#camera = camera;
        this._objectGroup.add(this.#camera);
        this.CameraPosition = "FOLLOW";
        // this.CameraPosition = "ORBIT";
    }

    #setupGunModels = () => {
        this.#meshes.gattling_gun.scale.multiplyScalar(0.1);
        this.#meshes.rail_gun.scale.multiplyScalar(0.1);

        let gattlingGunGroup = new THREE.Group();
        gattlingGunGroup.add(this.#meshes.gattling_gun_new.base_plate);
        gattlingGunGroup.add(this.#meshes.gattling_gun_new.struts);
        this.#currentGunBarrelGroup = new THREE.Group();
        this.#currentGunBarrelGroup.position.y = -7.8;
        this.#meshes.gattling_gun_new.barrel.position.y = 7.8;
        this.#currentGunBarrelGroup.add(this.#meshes.gattling_gun_new.barrel);
        gattlingGunGroup.add(this.#currentGunBarrelGroup);

        gattlingGunGroup.scale.multiplyScalar(0.1);
        gattlingGunGroup.position.set(0, -1.88, 4.29);
        gattlingGunGroup.quaternion.set(0.052475886136, 0, 0, 0.998622191509004);
        this.#currentGunBarrelGroup.rotation.x = -gattlingGunGroup.rotation.x;

        this.#currentGunObject = gattlingGunGroup;
        this._mainObject.add(this.#currentGunObject);
    }

    // sets up possible guns the player could pick up (the actual firing logic, bullet type, etc.)
    #setupGun = () => {
        let randomSphereGeo = new THREE.SphereBufferGeometry(0.4, 30, 30);
        let randomSphereMat = new THREE.MeshBasicMaterial({ color: 0xff7700 });
        let randomSphere = new THREE.Mesh(randomSphereGeo, randomSphereMat);
        randomSphere.layers.enable(window.GameHandler.RenderLayers.BLOOM);

        let randomCubeGeo = new THREE.BoxGeometry(0.25, 0.25, 5.5);
        let randomCubeMat = new THREE.MeshPhongMaterial({ color: 0x00ffff, shininess: 100 });
        let randomCube = new THREE.Mesh(randomCubeGeo, randomCubeMat);
        randomCube.layers.enable(window.GameHandler.RenderLayers.BLOOM);
        
        this.#currentGun = new Gun(this.#currentGunBarrelGroup, this, randomSphere, 750, 18, 10);
    }

    #setupShipClasses = () => {
        // setup the shipShaders array
        for (let className in this.#classes) {
            this.#shipShaders[this.#classes[className]] = [];
        }

        // setup the light class (the model, the texture, the shader, possibly the camera pos/curves etc.)
        // todo

        // setup the medium class (as above)
        this.#meshes.medium_ship.scale.multiplyScalar(0.5);
        this.#setupShipMaterial(
            this.#meshes.medium_ship,
            this.#textures.medium_ship,
            this.#shipShaders[this.#classes.MEDIUM],
            100,
            0.08,
            0.16,
            0.375
        );

        // setup the heavy class (as above)
        this.#meshes.heavy_ship.scale.multiplyScalar(0.5);
        this.#setupShipMaterial(
            this.#meshes.heavy_ship,
            this.#textures.heavy_ship,
            this.#shipShaders[this.#classes.HEAVY],
            100,
            0.08,
            0.16,
            0.375
        );
    }

    #setupShipMaterial = (object, texture, shadersArray, shininess, initialHue, hueMaskMin, hueMaskMax) => {
        //let testTexture = new THREE.TextureLoader().load('../../assets/player_ship_alt/textures/Material04_baseColor.jpeg');
        // let shipTexture = this.#textures.heavy_ship; //new THREE.TextureLoader().load('../../assets/player_ships/heavy_ship_texture.jpg');

        object.traverse(function(child) {
            if (child.isMesh) {
                // apply texture
                child.material.map = texture;

                child.material.shininess = shininess;
                child.material.specular.set(0x63cfff);

                child.material.onBeforeCompile = function(shader) {
                    shadersArray.push(shader);
                    shader.uniforms.shipColourHue = { value: initialHue };
                    //rgb to hsv/hsv to rgb methods
                    //source: https://gamedev.stackexchange.com/questions/59797/glsl-shader-change-hue-saturation-brightness
                    shader.fragmentShader = shader.fragmentShader.replace(
                      'void main() {',
                      [
                          'uniform float shipColourHue;',
                          '',
                          'vec3 rgbToHsv(vec3 c)',
                          '{',
                              '\tvec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);',
                              '\tvec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));',
                              '\tvec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));',
                          
                              '\tfloat d = q.x - min(q.w, q.y);',
                              '\tfloat e = 1.0e-10;',
                              '\treturn vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);',
                          '}',
                          '',
                          'vec3 hsvToRgb(vec3 c)',
                          '{',
                              '\tvec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);',
                              '\tvec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);',
                              '\treturn c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);',
                          '}',
                          '',
                          'void main() {'
                      ].join('\n')
                    );

                    shader.fragmentShader = shader.fragmentShader.replace(
                        '\t#include <map_fragment>',
                        [
                            '\t#ifdef USE_MAP',
                                '\t\tvec4 texelColor = texture2D(map, vUv);',
                                '\t\ttexelColor = mapTexelToLinear(texelColor);',
                                '\t\tvec3 hsvColor = rgbToHsv(texelColor.rgb);',
                                `\t\tif (hsvColor.x >= ${hueMaskMin} && hsvColor.x <= ${hueMaskMax})`,
                                '\t\t{',
                                    '\t\t\thsvColor.x = shipColourHue;',
                                    '\t\t\ttexelColor = vec4(hsvToRgb(hsvColor), texelColor.w);',
                                '\t\t}',
                                '\t\tdiffuseColor *= texelColor;',
                            '\t#endif'
                        ].join('\n')
                    );
                }

                child.material.needsUpdate = true;
            }
        });
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

    // for debug only
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
    }

    #setupShipThrusters = () => {
        this.#setupLightShipThrusters();
        this.#setupMediumShipThrusters();
        this.#setupHeavyShipThrusters();
        
        this.#setupThrusterLights();
    }

    #setupLightShipThrusters = () => {
    }

    #setupMediumShipThrusters = () => {
    }

    //have restructured the whole system so need to change this to setup all the thrusters for all the classes...
    #setupHeavyShipThrusters = () => {
        let extraOptions = {
            velSpread: new THREE.Vector3(5, 5, 0),
            originSpread: new THREE.Vector3(0.5, 0, 0)
        };

        let setupHeavyThruster = (thrusterObj, targetPos, direction) => {
            thrusterObj.target.position.copy(targetPos);
            this._mainObject.add(thrusterObj.target);
            thrusterObj.system = new ThrusterParticleSystemLocalPos(
                thrusterObj.target,
                direction.clone(),
                0.2,
                1000,
                1.75,
                extraOptions
            );
        }
        
        // top left
        let thrusterPos = new THREE.Vector3(2.8, 2.48, -8.74);
        let thrusterDir = new THREE.Vector3(-0.05, 0, -1);
        setupHeavyThruster(this._heavyThrusters.top_left, thrusterPos, thrusterDir);

        // bottom left
        thrusterPos.y *= -1;
        setupHeavyThruster(this._heavyThrusters.bottom_left, thrusterPos, thrusterDir);

        // bottom right
        thrusterPos.x *= -1;
        thrusterDir.x *= -1;
        setupHeavyThruster(this._heavyThrusters.bottom_right, thrusterPos, thrusterDir);

        // top right
        thrusterPos.y *= -1;
        setupHeavyThruster(this._heavyThrusters.top_right, thrusterPos, thrusterDir);
    }

    //creates and initialises the thruster lights based on the current ship class
    #setupThrusterLights = () => {
        let posKey = `${this.#currentClass}_position`;
        for (let lightKey in this.#thrusterLights) {
            let lightObj = this.#thrusterLights[lightKey];

            lightObj.light.position.copy(lightObj[posKey]);
            lightObj.light.castShadow = true;
            this._mainObject.add(lightObj.light);
        }
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
                this.#crosshairSprites[key].layers.enable(window.GameHandler.RenderLayers.BLOOM);
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

            let thrusterSpeed = this.#targetSpeed / this.#targetSpeedAccel * 3.5;
            Object.values(this.#currentThrusters).forEach(thruster => thruster.system.Speed = thrusterSpeed);

            let newIntensity = 4.5 * this.#targetSpeed / this.#maxSpeed * (0.8 + Math.random() * 0.5);
            Object.values(this.#thrusterLights).forEach(lightObj => lightObj.light.intensity = newIntensity);
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
        let targetZAngle = this.#baseTargetAngles.z * -this.#mouseOffsetPct.x; // barrel roll
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
    
    //disabled for now, actual turret models has been delayed
    #handleGunModelSwitching = () => {
        if (INPUT.KeyPressedOnce("ArrowRight")) {
            this.#gunNameIndex = UTILS.Mod(this.#gunNameIndex + 1, this.#gunNames.length);
            this.CurrentGun = this.#gunNames[this.#gunNameIndex];
        }
        else if (INPUT.KeyPressedOnce("ArrowLeft")) {
            this.#gunNameIndex = UTILS.Mod(this.#gunNameIndex - 1, this.#gunNames.length);
            this.CurrentGun = this.#gunNames[this.#gunNameIndex];
        }
    }

    #updateCrosshairVisibility = () => {
        if (window.GameHandler.IsMainMenu || window.GameHandler.IsPaused) {
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
    }

    #updateCrosshairHitMarkerOpacity = (dt) => {
        let opacity = INPUT.KeyPressed("leftMouse")
            ? THREE.MathUtils.lerp(this.#crosshairSprites["sometimes/bt"].material.opacity, 1, 15 * dt)
            : THREE.MathUtils.lerp(this.#crosshairSprites["sometimes/bt"].material.opacity, 0, 5 * dt);

        this.#crosshairSprites["sometimes/bt"].material.opacity = opacity;
        this.#crosshairSprites["sometimes/tl"].material.opacity = opacity;
        this.#crosshairSprites["sometimes/tr"].material.opacity = opacity;
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
        this.#updateCrosshairHitMarkerOpacity(dt);

        this.Object.updateWorldMatrix(true, true);
        Object.values(this.#currentThrusters).forEach(thruster => thruster.system.Main?.(dt));

        this.#currentGun.Main(dt);
    }

    MainNoPause(dt) {
        super.MainNoPause(dt);

        this.#handleCameraTransition(dt);

        this.#updateCrosshairVisibility();

        //debugging stuff
        let moveVec = new THREE.Vector3();
        let rotVec = new THREE.Vector3();
        let intensity = 0;
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
            intensity = 0.1;
            rotVec.x = 0.03;
        }
        if (INPUT.KeyPressed("f")) {
            moveVec.y = -0.1;
            intensity = -0.1;
            rotVec.x = -0.03;
        }
        if (INPUT.KeyPressed("t")) {
        }
        if (INPUT.KeyPressed("g")) {
        }
        if (INPUT.KeyPressed("shift")) {
            moveVec.multiplyScalar(0.1);
            rotVec.multiplyScalar(0.1);
        }

        //moveVec.multiplyScalar(0.5);
        
        // if (INPUT.KeyPressed("alt")) {
        //     // this.testLight.position.add(moveVec);
        //     // this.testLight.intensity += intensity;
        // }
        // else if (INPUT.KeyPressed("shift")) {
        //     // this.testLight.position.add(moveVec);
        //     // this.testLight.intensity += intensity;
        // }
        // else {
        //     this.#topLeftThrusterLight.position.add(moveVec);
        //     this.#topLeftThrusterLight.intensity += intensity;
        //     moveVec.x *= -1;
        //     this.#topRightThrusterLight.position.add(moveVec);
        //     this.#topRightThrusterLight.intensity += intensity;
        // }

        //this.#currentGunBarrelGroup.position.add(moveVec);
        // this.#currentGunBarrelGroup.rotateX(rotVec.x);

        // this.testLight.intensity = Math.max(0, this.testLight.intensity);
        // this.#leftThrusterLight.intensity = Math.max(0, this.#leftThrusterLight.intensity);
        // this.#rightThrusterLight.intensity = Math.max(0, this.#rightThrusterLight.intensity);
        //console.log(this.#topLeftThrusterLight.intensity);
        //this.#currentGunObject.position.add(moveVec);
        ///this.#currentGunObject.rotateX(rotVec.x);
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

    get Speed() {
        return this.#targetSpeed;
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

    get ShipHue() {
        return this.#shipHue;
    }

    set ShipHue(hue) {
        this.#shipHue = UTILS.LimitToRange(hue, 0, 1);
        this.#shipShaders[this.#currentClass].forEach(shader => shader.uniforms.shipColourHue.value = this.#shipHue);
    }

    /**
     * @param {string} value
     */
    set Class(value) {
        if (this.#classes[value] != undefined) {
            this.#currentClass = this.#classes[value];

            // update the light positions
            let positionKey = `${this.#currentClass}_position`;
            this.#thrusterLights.left.light.position.copy(this.#thrusterLights.left[positionKey]);
            this.#thrusterLights.right.light.position.copy(this.#thrusterLights.right[positionKey]);

            // activate the new current thruster, deactivate all others
            for (let [className, classLowerCaseName] of Object.entries(this.#classes)) {
                let thrusterName = `_${classLowerCaseName}Thrusters`;
                for (let thrusterKey in this[thrusterName]) {
                    if (this[thrusterName][thrusterKey].system != undefined) {
                        this[thrusterName][thrusterKey].system.Speed = 0;
                        this[thrusterName][thrusterKey].system.Active = className == value;
                        this[thrusterName][thrusterKey].system.Flush();

                        //need to disable the lights and set the new thruster to have the correct speed as well
                    }
                }
            }

            // set the current thrusters
            this.#currentThrusters = this[`_${this.#currentClass}Thrusters`];

            // set the current ship model
            // todo
        }
        else {
            console.log(`'${value}' is not a valid class.`);
        }
    }
}

export default PlayerObject;
