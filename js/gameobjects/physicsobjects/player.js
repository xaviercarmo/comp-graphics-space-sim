import * as THREE from '../../../libraries/three.module.js';
import * as INPUT from '../../input.js';
import * as UTILS from '../../utils.js';

import PhysicsObject from '../physics.js';
import RockParticleCloud from '../../rockparticlecloud.js';
import Shield from '../../shield.js';

import { OrbitControls } from '../../../libraries/OrbitControls.js';
import { ThrusterParticleSystemLocalPos } from '../../particlesystems/thrusterparticlesystem.js';
import { Gun } from '../../gun.js';

/** TODO
 * make boosters last duration
 * screen shake during boosters
 * lock onto enemy
 * track enemy speed functionality
 * shot-prediction circle for locked-on enemy (draw line from enemy helper circle to prediction circle) (circle is point to shoot for shots to hit, assuming straight line motion by enemy)
 */

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
    #orbitControlsPositionTracking = {
        old: new THREE.Vector3(),
        new: new THREE.Vector3()
    }

    //speed vars
    #currentSpeed = 0;
    #targetSpeed = 0;
    #targetSpeedIncrement = 10;

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
    #currentGunObject;
    #currentGunBarrelGroup;
    #gunNames = ["gattling_gun", "rail_gun"];
    #gunNameIndex = 0;
    _lightGuns = {
        middle: {
            object: new THREE.Object3D(),
            gun: undefined
        }
    };
    _mediumGuns = {
        left: {
            object: new THREE.Object3D(),
            gun: undefined
        },
        right: {
            object: new THREE.Object3D(),
            gun: undefined
        }
    };
    _heavyGuns = {
        left: {
            object: new THREE.Object3D(),
            gun: undefined
        },
        middle: {
            object: new THREE.Object3D(),
            gun: undefined
        },
        right: {
            object: new THREE.Object3D(),
            gun: undefined
        }
    };
    #currentGuns = {};
    
    //thrusters
    _lightThrusters = {
        left: {
            system: undefined,
            target: new THREE.Object3D()
        },
        right: {
            system: undefined,
            target: new THREE.Object3D()
        },
        top: {
            system: undefined,
            target: new THREE.Object3D()
        }
    };
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
            light_position: new THREE.Vector3(0.3, 0.68, -5),
            medium_position: new THREE.Vector3(0.8, 0.68, -6.8),
            heavy_position: new THREE.Vector3(1.4, 1.24, -5.5),
            light: new THREE.PointLight(0xff1000, 0, 10)
        },
        right: {
            light_position: new THREE.Vector3(-0.3, 0.68, -5),
            medium_position: new THREE.Vector3(-0.8, 0.68, -6.8),
            heavy_position: new THREE.Vector3(-1.4, 1.24, -5.5),
            light: new THREE.PointLight(0xff1000, 0, 10)
        }
    };

    //shields
    _lightShield = {
        radius: 4.6,
        object: undefined
    };
    _mediumShield = {
        radius: 5,
        object: undefined
    };
    _heavyShield = {
        radius: 5.4,
        object: undefined
    };
    #currentShield;

    //general
    #meshes;
    #textures;
    #crosshairSprites = {};
    #crosshairOrigin = new THREE.Vector3(0, 3, 0);
    #rockParticleCloud;
    #saveId;
    #savedKeys = [
        '_currentClass',
        '_lightShipSettings',
        '_mediumShipSettings',
        '_heavyShipSettings'
    ];

    //classes
    #classes = {
        LIGHT: 'light',
        MEDIUM: 'medium',
        HEAVY: 'heavy'
    };
    _currentClass = this.#classes.HEAVY;

    //ship models
    _lightShip = new THREE.Object3D();
    _mediumShip = new THREE.Object3D();
    _heavyShip = new THREE.Object3D();
    #currentShip;

    //ship stats
    _lightShipStats = {
        turnAccelMultiplier: 2.8,
        maxTurnSpeedMultiplier: 2,
        maxSpeed: 400,
        acceleration: 3.5,
        targetSpeedIncrementMultiplier: 3
    };
    _mediumShipStats = {
        turnAccelMultiplier: 1.5,
        maxTurnSpeedMultiplier: 1.4,
        maxSpeed: 200,
        acceleration: 1,
        targetSpeedIncrementMultiplier: 1.5
    };
    _heavyShipStats = {
        turnAccelMultiplier: 1,
        maxTurnSpeedMultiplier: 1,
        maxSpeed: 125,
        acceleration: 1,
        targetSpeedIncrementMultiplier: 1
    };
    #currentShipStats;

    //appearance
    #shipShaders = {};
    _lightShipSettings = {
        hsv: new THREE.Vector3(0.08, 1, 0),
        luminosity: 0,
        hMask: new THREE.Vector2(0, 1),
        sMask: new THREE.Vector2(0.556, 1),
        vMask: new THREE.Vector2(0.146, 1)
    };
    _mediumShipSettings = {
        hsv: new THREE.Vector3(0.08/*nice: 0.46*/, 1, 0.64),
        luminosity: 0, //nice: 1.15,
        hMask: new THREE.Vector2(0, 1),
        sMask: new THREE.Vector2(0, 0.163),
        vMask: new THREE.Vector2(0.579, 1)
    };
    _heavyShipSettings = {
        hsv: new THREE.Vector3(0.08, 1, 0),
        luminosity: 0,
        hMask: new THREE.Vector2(0.08, 0.3),
        sMask: new THREE.Vector2(0.3, 1),
        vMask: new THREE.Vector2(0.2, 1)
    };
    #currentShipSettings;

    #enemyTrackerObject;
    #enemyTrackerMaterial;
    #enemyTrackerObjects = [];

    //ability fields
    #isCloaked = false;

    //publics
    InputEnabled = true;
    
    //statics
    static SaveGamePrefix = 'playerSave-';
    
    constructor(assets, camera) {
        super(assets.meshes.heavy_ship);

        this.#meshes = assets.meshes;
        this.#textures = assets.textures;

        this.#setupShipClasses(this.#classes.LIGHT);
        this.#setupCameraPositions();
        this.#setupCameraTransitionCurves();
        this.#setupCamera(camera);

        this.#setupCrosshair();
        this.#setupEnemyTrackers(); // change to match radius of shield, also change their radius for each class
        
        window.addEventListener("wheel", this.#handleScroll);

        this.#rockParticleCloud = new RockParticleCloud(this._objectGroup, window.GameHandler.AssetHandler.LoadedImages.sprites.rockSprite, 600);
    }

    #setupCamera = (camera) => {
        this.#camera = camera;
        this._objectGroup.add(this.#camera);
        this.CameraPosition = "FOLLOW";
    }

    //these models will be used for auto-turrets on the ship later, for now this is unused
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

    #setupShipClasses = (defaultClass) => {
        this._lightShip.add(this.#meshes.light_ship);
        this.#meshes.light_ship.scale.set(4.3, 4.3, 4.3);

        this._mediumShip.add(this.#meshes.medium_ship);
        this.#meshes.medium_ship.scale.set(4.3, 4.3, 4.3);

        this._heavyShip.add(this.#meshes.heavy_ship);
        this.#meshes.heavy_ship.scale.set(0.5, 0.5, 0.5);
        // this._heavyShip = this.#meshes.heavy_ship;
        // this._heavyShip.scale.set(0.5, 0.5, 0.5);

        this.#setupShipMaterials();

        this.#setupShipThrusters();

        this.#setupGuns();

        this.#setupShipShields(); // try putting this before enemy trackers (they should be added last so they get drawn in front)

        this.Class = defaultClass;
    }

    #setupShipMaterials = () => {
        // setup the shipShaders arrays
        for (let className in this.#classes) {
            this.#shipShaders[this.#classes[className]] = [];
        }

        //masks out all coloured parts of the ship for now
        this.#setupShipMaterial(
            this._lightShip,
            this.#textures.light_ship,
            this.#shipShaders[this.#classes.LIGHT],
            this._lightShipSettings.hsv,
            this._lightShipSettings.hMask,
            this._lightShipSettings.sMask,
            this._lightShipSettings.vMask
        );

        this.#setupShipMaterial(
            this._mediumShip,
            this.#textures.medium_ship,
            this.#shipShaders[this.#classes.MEDIUM],
            this._mediumShipSettings.hsv,
            this._mediumShipSettings.hMask,
            this._mediumShipSettings.sMask,
            this._mediumShipSettings.vMask
        );

        this.#setupShipMaterial(
            this._heavyShip,
            this.#textures.heavy_ship,
            this.#shipShaders[this.#classes.HEAVY],
            this._heavyShipSettings.hsv,
            this._heavyShipSettings.hMask,
            this._heavyShipSettings.sMask,
            this._heavyShipSettings.vMask
        );
    }

    #setupShipMaterial = (object, texture, shadersArray, initialHsv, hueMask, saturationMask = new THREE.Vector2(0.3, 1), valueMask = new THREE.Vector2(0, 1)) => {
        object.traverse(function(child) {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;

                // apply texture
                child.material.map = texture;
                child.material.shininess = 1000;
                child.material.specular.set(0x63cfff);

                child.layers.enable(window.GameHandler.RenderLayers.BLOOM_VARYING);

                child.material.onBeforeCompile = function(shader) {
                    shadersArray.push(shader);

                    child.setMaskInverse = function(value) {
                        shader.uniforms.uMaskInverse.value = value;
                    };

                    shader.uniforms.uHSV = { value: initialHsv };
                    shader.uniforms.uHueMask = { value: hueMask };
                    shader.uniforms.uSaturationMask = { value: saturationMask };
                    shader.uniforms.uValueMask = { value: valueMask };
                    shader.uniforms.uMaskInverse = { value: false };

                    //rgb to hsv/hsv to rgb methods
                    //source: https://gamedev.stackexchange.com/questions/59797/glsl-shader-change-hue-saturation-brightness
                    shader.fragmentShader = shader.fragmentShader.replace(
                      'void main() {',
                      [
                          'uniform vec3 uHSV;',
                          'uniform vec2 uHueMask;',
                          'uniform vec2 uSaturationMask;',
                          'uniform vec2 uValueMask;',
                          'uniform bool uMaskInverse;',
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
                                `\t\tif (hsvColor.x >= uHueMask.x && hsvColor.x <= uHueMask.y && hsvColor.y >= uSaturationMask.x && hsvColor.y <= uSaturationMask.y && hsvColor.z >= uValueMask.x && hsvColor.z <= uValueMask.y) {`,
                                    '\t\t\thsvColor.x = uHSV.x;',
                                    '\t\t\thsvColor.y = uHSV.y;',
                                    '\t\t\thsvColor.z += uHSV.z;',
                                    '\t\t\ttexelColor = vec4(hsvToRgb(hsvColor), texelColor.w);',
                                '\t\t}',
                                '\t\telse if (uMaskInverse) {',
                                    '\t\t\thsvColor.y = 0.0;',
                                    '\t\t\thsvColor.z = 0.0;',
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

    #setupShipThrusters = () => {
        this.#setupLightShipThrusters();
        this.#setupMediumShipThrusters();
        this.#setupHeavyShipThrusters();
    }

    #setupLightShipThrusters = () => {
        let extraOptionsMedium = {
            velSpread: new THREE.Vector3(1.5, 1.5, 0),
            originSpread: new THREE.Vector3(0.15, 0.15, 0)
        };
        let setupMediumThruster = (thrusterObj, targetPos, direction) => {
            thrusterObj.target.position.copy(targetPos);
            this._lightShip.add(thrusterObj.target);
            thrusterObj.system = new ThrusterParticleSystemLocalPos(
                thrusterObj.target,
                direction.clone(),
                0.075,
                1000,
                1.5,
                extraOptionsMedium
            );
        }

        let extraOptionsLight = {
            velSpread: new THREE.Vector3(0.5, 0.5, 0),
            originSpread: new THREE.Vector3(0.05, 0.05, 0)
        };
        let setupLightThruster = (thrusterObj, targetPos, direction) => {
            thrusterObj.target.position.copy(targetPos);
            this._lightShip.add(thrusterObj.target);
            thrusterObj.system = new ThrusterParticleSystemLocalPos(
                thrusterObj.target,
                direction.clone(),
                0.05,
                1000,
                1.25,
                extraOptionsLight
            );
        }

        // left
        let thrusterPos = new THREE.Vector3(0.68, -0.49, -2.59);
        let thrusterDir = new THREE.Vector3(-0.03, 0, -1);
        setupMediumThruster(this._lightThrusters.left, thrusterPos, thrusterDir);

        // right
        thrusterPos.x *= -1;
        thrusterDir.x *= -1;
        setupMediumThruster(this._lightThrusters.right, thrusterPos, thrusterDir);

        // top
        thrusterPos.set(0, 0.02, -2.85)
        thrusterDir.x = 0;
        setupLightThruster(this._lightThrusters.top, thrusterPos, thrusterDir);
    }

    #setupMediumShipThrusters = () => {
        let extraOptionsHeavy = {
            velSpread: new THREE.Vector3(3, 3, 0),
            originSpread: new THREE.Vector3(0.2, 0.2, 0)
        };

        let setupHeavyThruster = (thrusterObj, targetPos, direction) => {
            thrusterObj.target.position.copy(targetPos);
            this._mediumShip.add(thrusterObj.target);
            thrusterObj.system = new ThrusterParticleSystemLocalPos(
                thrusterObj.target,
                direction.clone(),
                0.1,
                900,
                1.75,
                extraOptionsHeavy
            );
        }

        let extraOptionsMedium = {
            velSpread: new THREE.Vector3(1.5, 1.5, 0),
            originSpread: new THREE.Vector3(0.15, 0.15, 0)
        };
        let setupMediumThruster = (thrusterObj, targetPos, direction) => {
            thrusterObj.target.position.copy(targetPos);
            this._mediumShip.add(thrusterObj.target);
            thrusterObj.system = new ThrusterParticleSystemLocalPos(
                thrusterObj.target,
                direction.clone(),
                0.075,
                700,
                1.5,
                extraOptionsMedium
            );
        }

        // left
        let thrusterPos = new THREE.Vector3(1.66, -0.19, -3.47);
        let thrusterDir = new THREE.Vector3(-0.05, 0, -1);
        setupHeavyThruster(this._mediumThrusters.left, thrusterPos, thrusterDir);

        //right
        thrusterPos.x *= -1;
        thrusterDir.x *= -1;
        setupHeavyThruster(this._mediumThrusters.right, thrusterPos, thrusterDir);

        // middle middle
        thrusterPos.set(0, 0, -3.45);
        thrusterDir.x = 0;
        setupMediumThruster(this._mediumThrusters.mid_mid, thrusterPos, thrusterDir);

        // middle left
        thrusterPos.x = -0.5;
        thrusterPos.y = 0.45;
        setupMediumThruster(this._mediumThrusters.mid_left, thrusterPos, thrusterDir);

        // middle right
        thrusterPos.x *= -1;
        setupMediumThruster(this._mediumThrusters.mid_right, thrusterPos, thrusterDir);
    }

    #setupHeavyShipThrusters = () => {
        let extraOptions = {
            velSpread: new THREE.Vector3(2.5, 2.5, 0),
            originSpread: new THREE.Vector3(0.25, 0, 0)
        };

        let setupHeavyThruster = (thrusterObj, targetPos, direction) => {
            thrusterObj.target.position.copy(targetPos);
            this._heavyShip.add(thrusterObj.target);
            thrusterObj.system = new ThrusterParticleSystemLocalPos(
                thrusterObj.target,
                direction.clone(),
                0.1,
                1000,
                1.75,
                extraOptions
            );
        }
        
        // top left
        let thrusterPos = new THREE.Vector3(1.4, 1.24, -4.37);
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

    #setupGuns = () => {
        this.#setupLightGuns();
        this.#setupMediumGuns();
        this.#setupHeavyGuns();
    }

    #setupLightGuns = () => {
        let bulletGeo = new THREE.SphereBufferGeometry(0.2, 30, 30);
        let bulletMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        let bullet = new THREE.Mesh(bulletGeo, bulletMat);
        bullet.castShadow = true;
        bullet.layers.enable(window.GameHandler.RenderLayers.BLOOM_STATIC);

        let gunBulletSpeed = 750;
        let gunFireRate = 15;
        let projectileDuration = 5;

        let gunObjectPos = new THREE.Vector3(0, -0.4, 3);
        this._lightGuns.middle.object.position.copy(gunObjectPos);
        this._lightShip.add(this._lightGuns.middle.object);
        this._lightGuns.middle.gun = new Gun(this._lightGuns.middle.object, this, bullet, gunBulletSpeed, gunFireRate, projectileDuration);
    }

    #setupMediumGuns = () => {
        let bulletGeo = new THREE.SphereBufferGeometry(0.2, 30, 30);
        let bulletMat = new THREE.MeshBasicMaterial({ color: 0x8000ff });
        let bullet = new THREE.Mesh(bulletGeo, bulletMat);
        bullet.castShadow = true;
        bullet.layers.enable(window.GameHandler.RenderLayers.BLOOM_STATIC);

        let gunBulletSpeed = 750;
        let gunFireRate = 8;
        let projectileDuration = 5;

        let gunObjectPos = new THREE.Vector3(-0.38, -0.32, 2.31);
        this._mediumGuns.left.object.position.copy(gunObjectPos);
        this._mediumShip.add(this._mediumGuns.left.object);
        this._mediumGuns.left.gun = new Gun(this._mediumGuns.left.object, this, bullet, gunBulletSpeed, gunFireRate, projectileDuration);

        gunObjectPos.x *= -1;
        this._mediumGuns.right.object.position.copy(gunObjectPos);
        this._mediumShip.add(this._mediumGuns.right.object);
        this._mediumGuns.right.gun = new Gun(this._mediumGuns.right.object, this, bullet, gunBulletSpeed, gunFireRate, projectileDuration);
    }

    #setupHeavyGuns = () => {
        let smallBulletGeo = new THREE.SphereBufferGeometry(0.4, 30, 30);
        let smallBulletMat = new THREE.MeshBasicMaterial({ color: 0xff7700 });
        let smallBullet = new THREE.Mesh(smallBulletGeo, smallBulletMat);
        smallBullet.castShadow = true;
        smallBullet.layers.enable(window.GameHandler.RenderLayers.BLOOM_STATIC);

        let largeBulletGeo = new THREE.SphereBufferGeometry(0.8, 30, 30);
        let largeBulletMat = new THREE.MeshBasicMaterial({ color: 0x73ff00 });
        let largeBullet = new THREE.Mesh(largeBulletGeo, largeBulletMat);
        largeBullet.castShadow = true;
        largeBullet.layers.enable(window.GameHandler.RenderLayers.BLOOM_STATIC);

        let smallGunBulletSpeed = 1000;
        let smallGunFireRate = 8;

        let bigGunBulletSpeed = 450;
        let bigGunFireRate = 2;

        let projectileDuration = 5;

        let gunObjectPos = new THREE.Vector3(-2, -0.075, 2.75);
        this._heavyGuns.left.object.position.copy(gunObjectPos);
        this._heavyShip.add(this._heavyGuns.left.object);
        this._heavyGuns.left.gun = new Gun(this._heavyGuns.left.object, this, smallBullet, smallGunBulletSpeed, smallGunFireRate, projectileDuration);

        gunObjectPos.x *= -1;
        this._heavyGuns.right.object.position.copy(gunObjectPos);
        this._heavyShip.add(this._heavyGuns.right.object);
        this._heavyGuns.right.gun = new Gun(this._heavyGuns.right.object, this, smallBullet, smallGunBulletSpeed, smallGunFireRate, projectileDuration);

        gunObjectPos.set(0, -1.5, 9.7);
        this._heavyGuns.middle.object.position.copy(gunObjectPos);
        this._heavyShip.add(this._heavyGuns.middle.object);
        this._heavyGuns.middle.gun = new Gun(this._heavyGuns.middle.object, this, largeBullet, bigGunBulletSpeed, bigGunFireRate, projectileDuration);
    }

    #setupCameraPositions = () => {
        this.#cameraPositions.ORIGIN = {
            name: "ORIGIN",
            posnTarg: new THREE.Vector3(0, 0, -5),
            lookTarg: new THREE.Vector3()
        };

        this.#cameraPositions.FOLLOW = {
            name: "FOLLOW",
            posnTarg: new THREE.Vector3(0, 3.8, -15.95),
            lookTarg: new THREE.Vector3(0, 7.75, 7.5)
        };

        this.#cameraPositions.HANGAR = {
            name: "HANGAR",
            posnTarg: new THREE.Vector3(1, 2.5, 7.5),
            lookTarg: new THREE.Vector3(-0.5, 1.5, 5)
        };

        this.#cameraPositions.HANGAR_GUN_SLOT = {
            name: "HANGAR_GUN_SLOT",
            posnTarg: new THREE.Vector3(1, -2.5, 7.5),
            lookTarg: new THREE.Vector3(0.5, -1.5, 5)
        };

        this.#cameraPositions.ORBIT = { name: "ORBIT" };

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

        this.#cameraTransitionCurves.FOLLOW_HANGAR = new THREE.CatmullRomCurve3([
        	this.#cameraPositions.FOLLOW.posnTarg,
        	new THREE.Vector3(7.5, 3.4, 0),
            new THREE.Vector3(5, 2.9, 6),
        	this.#cameraPositions.HANGAR.posnTarg
        ]);

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
                this.#crosshairSprites[key].layers.enable(window.GameHandler.RenderLayers.BLOOM_STATIC);
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

    #setupEnemyTrackers = () => {
        // this.#enemyTrackerObject = window.GameHandler.AssetHandler.LoadedAssets.enemy_tracker;
        this.#enemyTrackerObject = window.GameHandler.AssetHandler.LoadedAssets.enemy_tracker_2;
        this.#enemyTrackerObject.scale.set(0.003, 0.003, 0.003);

        this.#enemyTrackerMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        this.#enemyTrackerMaterial.depthTest = false;
        this.#enemyTrackerMaterial.transparent = true;
    }

    #setupShipShields = () => {
        this._lightShield.object = new Shield(this._lightShip, this._lightShield.radius);
        this._mediumShield.object = new Shield(this._mediumShip, this._mediumShield.radius);
        this._heavyShield.object = new Shield(this._heavyShip, this._heavyShield.radius);
    }

    #handleScroll = (event) => {
        if (window.GameHandler.IsGameRunning && event.deltaY != 0 && this.InputEnabled) {
            //initialise a scrollDelta so we know how much their mouse wheel is scrolling each time
            if (this.#scrollDelta == 0) {
                this.#scrollDelta = Math.abs(event.deltaY);
            }

            let scrollTicks = -event.deltaY / this.#scrollDelta;

            let newTargetSpeed = this.#targetSpeed + scrollTicks * this.#targetSpeedIncrement * this.#currentShipStats.targetSpeedIncrementMultiplier;
            this.#targetSpeed = UTILS.LimitToRange(newTargetSpeed, 0, this.#currentShipStats.maxSpeed);

            this.#updateCurrentThrusterSpeeds();
        }
    }

    #updateCurrentThrusterSpeeds = () => {
        let thrusterSpeed = this.#targetSpeed / this.#currentShipStats.maxSpeed * 50;
        Object.values(this.#currentThrusters).forEach(thruster => {
            if (thruster.system) {
                thruster.system.Speed = thrusterSpeed;
            }
        });
    }

    #handleMouseMove = (event) => {
        if (!window.GameHandler.IsPaused && this.InputEnabled) {
            if (document.pointerLockElement === window.GameHandler.Renderer.domElement) {
                this.#mouseOffset.x += -event.movementX; //y movement is positive when going right, the reverse of ThreeJS x axis orientation
                this.#mouseOffset.y += -event.movementY; //y movement is positive when going down, the reverse of ThreeJS y axis orientation

                this.#mouseOffset.clampLength(-this.#maxMouseOffset, this.#maxMouseOffset);
            }
        }
    }

    #adjustRotationAmounts = (dt) => {
        this.#mouseOffsetPct.set(this.#mouseOffset.x / this.#maxMouseOffset, this.#mouseOffset.y / this.#maxMouseOffset);
        let adjustedMouseOffsetPct = this.#mouseOffsetPct.clone().multiplyScalar(this.#currentShipStats.maxTurnSpeedMultiplier);

        let deltaRotAmt = UTILS.SubVectors(adjustedMouseOffsetPct, this.#rotAmt);

        let timePct = Math.sqrt(this.#rotAmt.length());
        let maxMagnitude = (0.6 + timePct) * this.#currentShipStats.turnAccelMultiplier * dt;
        this.#rotAmt.add(deltaRotAmt.clampLength(-maxMagnitude, maxMagnitude));

        this._objectGroup.rotateX(-this.#rotAmt.y * dt);
        this._objectGroup.rotateY(this.#rotAmt.x * dt);

        let targetXAngle = this.#baseTargetAngles.x * -adjustedMouseOffsetPct.y; // back and forth
        let targetYAngle = this.#baseTargetAngles.y * this.#rotAmt.x; // side to side
        let targetZAngle = this.#baseTargetAngles.z * -adjustedMouseOffsetPct.x; // barrel roll
        this.#targetEuler.set(targetXAngle, targetYAngle, targetZAngle);
        this.#targetQuaternion.setFromEuler(this.#targetEuler);

        this._mainObject.quaternion.slerp(this.#targetQuaternion, 1.6 * dt);
    }

    #adjustPositionOffset = (dt) => {
        let speedPct = this.#targetSpeed / this.#currentShipStats.maxSpeed;

        let maxCrosshairOffset = 2 + (2 * speedPct);
        this.#crosshairSprites["always/arcs"].position.set(
            this.#crosshairOrigin.x + this.#mouseOffsetPct.x * maxCrosshairOffset,
            this.#crosshairOrigin.y + this.#mouseOffsetPct.y * maxCrosshairOffset,
            this.#crosshairOrigin.z
        );
        
        this.#crosshairSprites["sometimes/bt"].position.copy(this.#crosshairSprites["always/arcs"].position);
        this.#crosshairSprites["sometimes/tl"].position.copy(this.#crosshairSprites["always/arcs"].position);
        this.#crosshairSprites["sometimes/tr"].position.copy(this.#crosshairSprites["always/arcs"].position);
        
        this.#crosshairSprites["halo"].position.set(
            this.#crosshairOrigin.x + (this.#rotAmt.x / this.#currentShipStats.maxTurnSpeedMultiplier) * maxCrosshairOffset,
            this.#crosshairOrigin.y + (this.#rotAmt.y / this.#currentShipStats.maxTurnSpeedMultiplier) * maxCrosshairOffset,
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
                //look at does not work nicely, need to save orientation and set the quaternion
                this.#camera.lookAt(this.#cameraPosition.lookTarg);
                this.#cameraTransitioning = false;
            }
        }
        else if (this.#cameraPosition.name == "ORBIT") {
            this._mainObject.getWorldPosition(this.#orbitControls.target);
            let deltaPos = this.#orbitControlsPositionTracking.new.sub(this.#orbitControlsPositionTracking.old);
            this.#camera.position.add(deltaPos);
            this.#orbitControls.update();
        }
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
        if (window.GameHandler.IsMainMenu || window.GameHandler.IsPaused || !this.InputEnabled) {
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

    #refreshShaderUniformsFromSettings = () => {
        this.#shipShaders[this._currentClass].forEach(shader => {
            shader.uniforms.uHSV.value = this.#currentShipSettings.hsv;
            shader.uniforms.uHueMask.value = this.#currentShipSettings.hMask;
            shader.uniforms.uSaturationMask.value = this.#currentShipSettings.sMask;
            shader.uniforms.uValueMask.value = this.#currentShipSettings.vMask;
        });
    }

    #handleEnemyTrackerObjects = () => {
        //create objects that point towards enemies
        let enemyObjects = window.GameHandler.EnemyObjects;
        let lengthDiff = enemyObjects.length - this.#enemyTrackerObjects.length;
        if (lengthDiff > 0) {
            for (let i = 0; i < lengthDiff; i++) {
                let trackerObj = this.#spawnTracker();

                window.GameHandler.Scene.add(trackerObj);
                this.#enemyTrackerObjects.push(trackerObj);
            }
        }
        else if (lengthDiff < 0) {
            for (let i = 0; i < -lengthDiff; i++) {
                window.GameHandler.Scene.remove(trackerObj);
            }
        }

        let currForwardDirection = new THREE.Vector3();
        this._objectGroup.getWorldDirection(currForwardDirection);

        let mainObjWorldPos = new THREE.Vector3();
        this._mainObject.getWorldPosition(mainObjWorldPos);
            
        for (let i = 0; i < enemyObjects.length; i++) {
            let dirToEnemy = enemyObjects[i].Position.sub(mainObjWorldPos);
            let angleToEnemy = currForwardDirection.angleTo(dirToEnemy);

            dirToEnemy.normalize();
            dirToEnemy.multiplyScalar(4);
            let worldPos = mainObjWorldPos.clone();
            worldPos.add(dirToEnemy);
            
            this.#enemyTrackerObjects[i].position.copy(worldPos);
            this.#enemyTrackerObjects[i].lookAt(enemyObjects[i].Position);
            this.#enemyTrackerObjects[i].rotateX(Math.PI / 2);

            this.#applyOpacityToTracker(this.#enemyTrackerObjects[i], angleToEnemy - 0.5, angleToEnemy - 0.5);
        }
    }

    #spawnTracker = () => {
        let trackerObj = this.#enemyTrackerObject.clone();
        let trackerMat = this.#enemyTrackerMaterial.clone();
        trackerMat.opacityForBloom = 1;
        trackerObj.traverse(child => {
            if (child.isMesh) {
                child.material = trackerMat;
                child.layers.enable(window.GameHandler.RenderLayers.BLOOM_STATIC);
            }
        });

        return trackerObj;
    }

    #applyOpacityToTracker = (tracker, opacity, bloomOpacity) => {
        tracker.traverse(child => {
            if (child.material) {
                child.material.opacity = opacity;
                child.material.opacityForBloom = bloomOpacity;
            }
        });
    }

    //public methods
    Main(dt) {
        super.Main(dt);

        this.#orbitControlsPositionTracking.old.copy(this._objectGroup.position);

        //later: this should be pressedOnce, and booster should be locked-in
        //if boosting
        if (INPUT.KeyPressed('shift') && this.InputEnabled) {
            this.#currentSpeed = THREE.Math.lerp(this.#currentSpeed, this.#targetSpeed * 4, this.#currentShipStats.acceleration * 4 * dt);
        }
        else {
            // if deccelerating from booster
            if (this.#currentSpeed > this.#currentShipStats.maxSpeed) {
                this.#currentSpeed = THREE.Math.lerp(this.#currentSpeed, this.#targetSpeed, this.#currentShipStats.acceleration * 4 * dt);
            }
            else {
                this.#currentSpeed = THREE.Math.lerp(this.#currentSpeed, this.#targetSpeed, this.#currentShipStats.acceleration * dt);
            }
        }
        this._objectGroup.translateZ(this.#currentSpeed * dt);

        this.#orbitControlsPositionTracking.new.copy(this._objectGroup.position);

        //handle all visual effects associated with current movement
        if (this.InputEnabled && INPUT.KeyPressed("rightMouse")) {
            this.#mouseOffset.set(0, 0);
        }

        this.#adjustRotationAmounts(dt);
        this.#adjustPositionOffset(dt);

        this.#updateCrosshairHitMarkerOpacity(dt);

        this.Object.updateWorldMatrix(true, true);
        Object.values(this.#currentThrusters).forEach(thruster => thruster.system?.Main?.(dt));
        let newIntensity = 4.5 * this.#targetSpeed / this.#currentShipStats.maxSpeed * (0.8 + Math.random() * 0.5);
        Object.values(this.#thrusterLights).forEach(lightObj => lightObj.light.intensity = newIntensity);

        Object.values(this.#currentGuns).forEach(gunObj => {
            gunObj.gun.Firing = this.InputEnabled && INPUT.KeyPressed("leftMouse");
            gunObj.gun.Main(dt);
        });

        this.#rockParticleCloud.Main(dt);

        this.#handleEnemyTrackerObjects();

        this.#currentShield.object.Main(dt);
    }

    MainNoPause(dt) {
        super.MainNoPause(dt);

        this.#handleCameraTransition(dt);

        this.#updateCrosshairVisibility();

        //debugging stuff
        let moveVec = new THREE.Vector3();
        let rotVec = new THREE.Vector3();
        let intensity = 0;
        let scaleAmt = 0;
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
            intensity = 0.1;
            rotVec.x = 0.03;
        }
        if (INPUT.KeyPressed("f")) {
            intensity = -0.1;
            rotVec.x = -0.03;
        }
        if (INPUT.KeyPressed("t")) {
            moveVec.y = 0.1;
        }
        if (INPUT.KeyPressed("g")) {
            moveVec.y = -0.1;
        }
        if (INPUT.KeyPressed("z")) {
            scaleAmt = -0.01;
        }
        if (INPUT.KeyPressed("x")) {
            scaleAmt = 0.01;
        }
        if (INPUT.KeyPressed("shift")) {
            moveVec.multiplyScalar(0.1);
            rotVec.multiplyScalar(0.1);
            scaleAmt *= 0.1;
        }

        if (this.#cameraPosition.name == "FOLLOW") {
            this.#camera.rotation.y = INPUT.KeyPressed("space") ? Math.PI : 0;
        }

        // this._mediumThrusters.mid_mid.target.position.add(moveVec);
        // this._lightThrusters.top.target.position.add(moveVec);
        
        // this.testCube.position.x -= moveVec.x;
        // this.testCube.position.y += moveVec.y;
        // this.testCube.position.z += moveVec.z;

        // this.testCube2.position.x += moveVec.x;
        // this.testCube2.position.y += moveVec.y;
        // this.testCube2.position.z += moveVec.z;

        // this.testCube3.position.x -= moveVec.x;
        // this.testCube3.position.y += moveVec.y;
        // this.testCube3.position.z += moveVec.z;

        
        // this.#thrusterLights.left.light.position.add(moveVec);
        // this.#thrusterLights.left.light.intensity += intensity;
        // moveVec.x *= -1;
        // this.#thrusterLights.right.light.position.add(moveVec);
        // this.#thrusterLights.right.light.intensity += intensity;
    }

    PostPhysicsCallback(dt) {
        super.PostPhysicsCallback(dt);

        this.FlushForces();
    }

    SetupPointerLock() {
        let canvas = window.GameHandler.Renderer.domElement;
        canvas.requestPointerLock = canvas.requestPointerLock;
        canvas.onclick = () => {
            if (!window.GameHandler.IsPaused && this.InputEnabled) {
                canvas.requestPointerLock();
            }
        }

        document.addEventListener("mousemove", this.#handleMouseMove);

        canvas.requestPointerLock();
    }

    SaveToLocalStorage(newPlayerName) {
        if (newPlayerName != undefined) {
            this.#saveId = PlayerObject.SaveGamePrefix + newPlayerName.toLowerCase();
        }

        let saveObj = {};

        for (let key of this.#savedKeys) {
            saveObj[key] = this[key];
        }

        localStorage.setItem(this.#saveId, JSON.stringify(saveObj));
    }

    LoadFromLocalStorage(saveId) {
        this.#saveId = saveId;

        let saveObj = JSON.parse(localStorage.getItem(saveId));

        for (let key in saveObj) {
            this[key] = saveObj[key];
        }

        this.Class = this._currentClass;
    }

    HitByBullet() {
        this.#currentShield.object.Hit();
    }

    get CameraPosition() { return this.#cameraPosition; }

    /**
     * @param {string} positionName
     */
    set CameraPosition(positionName) {
        if (positionName != this.#cameraPosition.name) {
            if (this.#cameraPositions[positionName] != undefined) {
                this.#oldCameraPosition = this.#cameraPosition ?? this.#cameraPositions.ORIGIN;

                this.#cameraPosition = this.#cameraPositions[positionName];

                if (positionName != "ORBIT") {
                    if (this.#oldCameraPosition.name == "ORBIT") {
                        this.#orbitControls.enabled = false;
                        this._objectGroup.add(this.#camera);
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

                        // if in the middle of a transition, reverse it
                        if (this.#cameraTransitioning) {
                            this.#cameraTransitionProgress = 1 - this.#cameraTransitionProgress;
                        }

                        this.#cameraTransitioning = true;
                    }

                    this.InputEnabled = true;
                }
                else {
                    if (this.#orbitControls == undefined) {
                        let canvas = window.GameHandler.Renderer.domElement;
                        this.#orbitControls = new OrbitControls(this.#camera, canvas);
                    }
                    console.log(this.#camera.position.clone());
                    let relativePosGlobal = this._objectGroup.localToWorld(this.#camera.position.clone());

                    window.GameHandler.Scene.add(this.#camera);
                    console.log(this.#camera.position.clone());

                    this.#camera.position.copy(relativePosGlobal);

                    this.#cameraCurve = undefined;
                    // this.#cameraTransitioning = true;
                    this.#orbitControls.enabled = true;

                    this.InputEnabled = false;
                }
            }
            else {
                console.log(`"${positionName}" is an invalid camera position name.`);
            }
        }
    }

    get Speed() {
        return this.#currentSpeed;
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

    set ShipHue(hue) {
        this.#currentShipSettings.hsv.x = UTILS.LimitToRange(hue, 0, 1);
        this.#refreshShaderUniformsFromSettings();
    }

    set ShipSaturation(saturation) {
        this.#currentShipSettings.hsv.y = UTILS.LimitToRange(saturation, 0, 1);
        this.#refreshShaderUniformsFromSettings();
    }

    set ShipValue(value) {
        this.#currentShipSettings.hsv.z = UTILS.LimitToRange(value, -1, 1);
        this.#refreshShaderUniformsFromSettings();
    }

    set ShipLuminosity(luminosity) {
        this.#currentShipSettings.luminosity = UTILS.LimitToRange(luminosity, 0, 3);
    }
    
    set ShipHueMask(mask) {
        if (mask instanceof THREE.Vector2) {
            this.#currentShipSettings.hMask = mask;
            this.#refreshShaderUniformsFromSettings();
        }
    }

    set ShipSaturationMask(mask) {
        if (mask instanceof THREE.Vector2) {
            this.#currentShipSettings.sMask = mask;
            this.#refreshShaderUniformsFromSettings();
        }
    }

    set ShipValueMask(mask) {
        if (mask instanceof THREE.Vector2) {
            this.#currentShipSettings.vMask = mask;
            this.#refreshShaderUniformsFromSettings();
        }
    }

    get Class() {
        return this._currentClass;
    }

    get IsCloaked() {
        return this.#isCloaked;
    }

    /**
     * @param {string} value
     */
    set Class(value) {
        if (Object.values(this.#classes).includes(value)) {
            this._currentClass = value;

            // set the current ship model
            this.#currentShip = this[`_${this._currentClass}Ship`];
            this._changeMainObject(this.#currentShip);

            // set the current ship stats
            this.#currentShipStats = this[`_${this._currentClass}ShipStats`];
            this.#targetSpeed = UTILS.LimitToRange(this.#targetSpeed, 0, this.#currentShipStats.maxSpeed);

            // update the light positions
            let positionKey = `${this._currentClass}_position`;
            for (let lightKey in this.#thrusterLights) {
                let lightObj = this.#thrusterLights[lightKey];
    
                lightObj.light.position.copy(lightObj[positionKey]);
                this.#currentShip.add(lightObj.light);
            }
            // this.#thrusterLights.left.light.position.copy(this.#thrusterLights.left[positionKey]);
            // this.#thrusterLights.right.light.position.copy(this.#thrusterLights.right[positionKey]);

            // activate the new current thruster and current shield, deactivate all others
            for (let className of Object.values(this.#classes)) {
                let isCurrentClass = className == this._currentClass;

                let thrusterName = `_${className}Thrusters`;
                for (let thrusterKey in this[thrusterName]) {
                    if (this[thrusterName][thrusterKey].system != undefined) {
                        this[thrusterName][thrusterKey].system.Speed = 0;
                        this[thrusterName][thrusterKey].system.Active = isCurrentClass;
                        this[thrusterName][thrusterKey].system.Flush();
                    }
                }

                let shieldName = `_${className}Shield`;
                if (isCurrentClass) {
                    this.#currentShield = this[shieldName];
                    this._colliderRadius = this.#currentShield.radius;
                    this[shieldName].object.Activate();
                }
                else {
                    this[shieldName].object.Deactivate();
                }
            }

            // set the current thrusters
            this.#currentThrusters = this[`_${this._currentClass}Thrusters`];
            this.#updateCurrentThrusterSpeeds();

            // flush the current guns colleciton, and set to the new guns collection
            Object.values(this.#currentGuns).forEach(gunObj => gunObj.gun.Flush());
            this.#currentGuns = this[`_${this._currentClass}Guns`];

            // set the current settings object
            this.#currentShipSettings = this[`_${this._currentClass}ShipSettings`];

            // update the hsv and luminosity sliders to have current values
            $('#shipHueSlider').val(this.#currentShipSettings.hsv.x);
            $('#shipSaturationSlider').val(this.#currentShipSettings.hsv.y);
            $('#shipValueSlider').val(this.#currentShipSettings.hsv.z);
            $('#shipLuminositySlider').val(this.#currentShipSettings.luminosity);
            window.GameHandler.SetVariableBloomPassStrength(this.#currentShipSettings.luminosity);

            // update the masking sliders to have current values
            $('#shipHueMaskSlider').data('ionRangeSlider').update({
                from: this.#currentShipSettings.hMask.x,
                to: this.#currentShipSettings.hMask.y
            });
            $('#shipSaturationMaskSlider').data('ionRangeSlider').update({
                from: this.#currentShipSettings.sMask.x,
                to: this.#currentShipSettings.sMask.y
            });
            $('#shipValueMaskSlider').data('ionRangeSlider').update({
                from: this.#currentShipSettings.vMask.x,
                to: this.#currentShipSettings.vMask.y
            });
        }
        else {
            console.log(`'${value}' is not a valid class.`);
        }
    }
}

export default PlayerObject;
