import * as THREE from '../../../libraries/three.module.js';
import * as INPUT from '../../input.js';
import * as UTILS from '../../utils.js';

import PhysicsObject from '../physics.js';
import Shield from '../../shield.js';

import { ThrusterParticleSystemLocalPos } from '../../particlesystems/thrusterparticlesystem.js';
import { Gun } from '../../gun.js';

/** TODO
 * when evade state activated, evade for a minimum 3-seconds before returning to any other state
 * cut-off is very important, as the gun is quite useless right now...
 * FOLLOW - choose a point that is not within 10units of another enemy's chosen point
 */

class EnemyObject extends PhysicsObject {
    #playerRef = window.GameHandler.Player;
    #forward = new THREE.Vector3(0, 0, 1);

    #clone;
    #currentSpeed = 0;
    #targetSpeed = 0;
    #maxSpeed = 200;
    #acceleration = 0.5;

    #turnAccel = 0.5;

    #minDistToPlayer = 150;
    #currDistToPlayer = 0;
    #currAngleToPlayer = 0;
    #currPlayerAngleToEnemy = 0;

    #circleSprite;
    #circleSpriteTargetOpacity = 0;
    #circleSpriteVisibleDist = 100;

    #sightRadius = 500;
    #alreadySightedRadius = 2500;
    #playerHasBeenSighted = false;
    #timeSincePlayerLastSighted = 0;

    #patrolRadius = 1000;
    #currentPatrolCentre = new THREE.Vector3();
    #currentPatrolWaypoint = new THREE.Vector3();
    
    #states = {
        IDLE: 'idle',
        PATROL: 'patrol',
        FOLLOW: 'follow',
        CUTOFF: 'cutoff',
        EVADE: 'evade',
        SENTRY: 'sentry'
    }
    #currentState;

    #evadeCounter = 0;
    #evadeTimeLimit = 0;
    #evadeTurnAmts = new THREE.Vector2();
    #targetEvadeTurnAmts = new THREE.Vector2();

    #gunObj = new THREE.Object3D();
    #gun;

    #thrusterSystem;
    #thrusterTarget = new THREE.Object3D;
    #thrusterLight = new THREE.PointLight(0xff1000, 0, 15);

    #shield;
    #health; 

    constructor() {
        super(window.GameHandler.AssetHandler.LoadedAssets.enemy_ship.clone());

        this.#clone = this._objectGroup.clone(false);

        this.#setupModel();
        this.#setupSprites();

        this.#setupGuns();
        this.#setupThrusters();

        this._colliderRadius = 6;
        this.#shield = new Shield(this._objectGroup, this._colliderRadius);
        this.#health = 100; 
    }

    #setupModel = () => {
        this._mainObject.scale.set(0.35, 0.35, 0.35);

        this._mainObject.traverse(function(child) {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;

                child.material.map = window.GameHandler.AssetHandler.LoadedImages.enemyShipTextures.enemyShipTexture;
                child.material.shininess = 1000;
                child.material.specular.set(0x63cfff);

                child.layers.enable(window.GameHandler.RenderLayers.BLOOM_STATIC_HIGH);

                child.material.onBeforeCompile = function(shader) {
                    child.setMaskInverse = function(value) {
                        shader.uniforms.uMaskInverse.value = value;
                    }

                    shader.uniforms.uMaskInverse = { value: false };

                    shader.fragmentShader = shader.fragmentShader.replace(
                        'void main() {',
                        [
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
                                `\t\tif (hsvColor.y <= 0.163 && hsvColor.z >= 0.395) {`,
                                    '\t\t\thsvColor.x = 0.98;',
                                    '\t\t\thsvColor.y = 1.0;',
                                    '\t\t\thsvColor.z += 1.0;',
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

    #setupSprites = () => {
        let circleTexture = window.GameHandler.AssetHandler.LoadedImages.sprites.enemyCircle;
        let material = new THREE.SpriteMaterial({ map: circleTexture, sizeAttenuation: false });
        material.transparent = true;
        material.opacity = 1;

        this.#circleSprite = new THREE.Sprite(material);
        this.#circleSprite.layers.enable(window.GameHandler.RenderLayers.BLOOM_STATIC);
        this.#circleSprite.scale.set(0.05, 0.05, 0.05);
        this._objectGroup.add(this.#circleSprite);
        window.testing = this.#circleSprite;
    }

    #setupGuns = () => {
        let bulletGeo = new THREE.SphereBufferGeometry(0.3, 30, 30);
        let bulletMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        let bullet = new THREE.Mesh(bulletGeo, bulletMat);
        bullet.castShadow = true;
        bullet.layers.enable(window.GameHandler.RenderLayers.BLOOM_STATIC);

        let gunBulletSpeed = 750;
        let gunFireRate = 5;
        let projectileDuration = 5;
        let gunDamage = 1; 

        this.#gunObj.position.set(0, -0.04, 5);
        this.Object.add(this.#gunObj);
        this.#gun = new Gun(this.#gunObj, this, bullet, gunBulletSpeed, gunFireRate, projectileDuration, gunDamage);
    }

    #setupThrusters = () => {
        this.#thrusterLight.position.set(0, 0.68, -5);
        this.Object.add(this.#thrusterLight);

        let extraOptions = {
            velSpread: new THREE.Vector3(1.5, 1.5, 0),
            originSpread: new THREE.Vector3(0.15, 0.15, 0)
        };

        this.#thrusterTarget.position.set(0, 0, -2.85)
        this.Object.add(this.#thrusterTarget);

        this.#thrusterSystem = new ThrusterParticleSystemLocalPos(
            this.#thrusterTarget,
            new THREE.Vector3(0, 0, -1),
            0.1,
            500,
            1.5,
            extraOptions
        )
    }

    // "visiblity" of player right now is just 500m radius sphere when player hasnt already been found, and 2500m radius sphere if they were discovered - really
    // should be far in front of the ship, and 500m hemisphere behind (for radar).
    // hoping to implement this later.

    // based on factors like current position, velocity, orientation relative to player etc. determine
    // what state enemy should be in right now
    #determineCurrentState = (dt) => {
        // if player already seen, then its easier to keep track of them
        let playerCurrentlyVisible = this.#playerHasBeenSighted
            ? this.#currDistToPlayer <= this.#alreadySightedRadius
            : this.#currDistToPlayer <= this.#sightRadius;

        // if the player has already been sighted
        if (this.#playerHasBeenSighted) {
            // if player can currently be seen on radar
            if (playerCurrentlyVisible) {
                this.#timeSincePlayerLastSighted = 0;
            }
            // otherwise count time since last sighting
            else {
                this.#timeSincePlayerLastSighted += dt;

                if (this.#timeSincePlayerLastSighted >= 4) {
                    this.#playerHasBeenSighted = false;
                }
            }
        }
        // otherwise
        else {
            this.#playerHasBeenSighted = playerCurrentlyVisible;
        }
        
        // if the player has not been sighted, patrol the area
        if (!this.#playerHasBeenSighted) {
            if (this.#currentState != this.#states.PATROL) {
                this.#currentPatrolCentre.copy(this.Position);
            }

            this.#currentState = this.#states.PATROL;
        }
        // otherwise if the enemy knows where the player is right now
        else {
            // if the player is coming towards the enemy
            // coming towards = low currPlayerAngleToEnemy
            if (this.#currPlayerAngleToEnemy < 0.6) {
                // if player is going to collide soon, evade
                if (this.#timeUntilPlayerArrives() < 5) {
                    this.#currentState = this.#states.EVADE;
                }
                //otherwise just shoot em' up (sentry) (will still move occasionally to avoid being shot by player)
                else {
                    //later this should check if health is low, if so, then switch to evade rather than sentry
                    this.#currentState = this.#states.SENTRY;
                }
            }
            // otherwise if the player is not coming towards the enemy
            else {
                // chase the player if the distance between is moderate and their difference in speed is not great
                if (this.#currDistToPlayer < 800 && this.#playerRef.Speed <= this.#maxSpeed) {
                    this.#currentState = this.#states.FOLLOW;
                }
                // otherwise try to cut them off
                else {
                    this.#currentState = this.#states.CUTOFF;
                }
            }
        }

        // console.log(`currently visible: ${playerCurrentlyVisible}, sighted: ${this.#playerHasBeenSighted}, timeSinceLast: ${this.#timeSincePlayerLastSighted}`);
    }

    #timeUntilPlayerArrives = () => {
        return this.#currDistToPlayer / this.#playerRef.Speed;
    }

    // picks a random point in the current patrol radius around current patrol center and moves towards it. Picks a new point when close to the current point.
    // moves at 1/3 max speed while patrolling.
    // NOTE: Potentially handle rotation the same as player (get direction to player and rotate fixed amount in that direction). Not "needed" for now
    #handlePatrolState = (dt) => {
        this.#gun.Firing = false;

        if (UTILS.SubVectors(this.#currentPatrolWaypoint, this.Position).lengthSq() < 50 * 50) {
            this.#currentPatrolWaypoint = this.#generateNewWaypoint();
            // this.testObj.position.copy(this.#currentPatrolWaypoint);
        }

        this.#clone.lookAt(this.#currentPatrolWaypoint);
        this._objectGroup.quaternion.slerp(this.#clone.quaternion, this.#turnAccel * dt);

        this.#targetSpeed = this.#maxSpeed;
        //this needs to not be a cutoff, the speed of the ship needs to scale with how hard it has to turn to reach the waypoint.
        //it needs to drop off to the minimum (10) QUICKLY once its gets past ~0.4
        let angleToWaypoint = this.#getAngleToPoint(this.#currentPatrolWaypoint);

        //asymptote of < 0.3 graph
        if (angleToWaypoint < 0.07) {
            this.#targetSpeed = this.#maxSpeed;
        }
        else if (angleToWaypoint <= 0.3) {

            this.#targetSpeed = 10 / (angleToWaypoint - 0.07) + 10;
        }
        //0.74 is the asymptote of >0.3 graph, after that point it crosses to high numbers again
        else if (angleToWaypoint < 0.74) {
            this.#targetSpeed = 10 / (angleToWaypoint - 0.74) + 76;
        }
        //if it crosses the asymptote, set it to the minimum
        else {
            this.#targetSpeed = 10;
        }

        this.#targetSpeed = UTILS.LimitToRange(this.#targetSpeed, 10, this.#maxSpeed);
        this.#currentSpeed = THREE.Math.lerp(this.#currentSpeed, this.#targetSpeed, this.#acceleration * dt);
        this._objectGroup.translateZ(this.#currentSpeed * dt);
    }

    #generateNewWaypoint = () => {
        let direction = new THREE.Vector3(
            UTILS.RandomFloatInRange(-1, 1),
            UTILS.RandomFloatInRange(-1, 1),
            UTILS.RandomFloatInRange(-1, 1)
        );
        direction.normalize();
        direction.multiplyScalar(this.#patrolRadius);

        return UTILS.AddVectors(this.#currentPatrolCentre, direction);
    }

    #handleFollowState = (dt) => {
        this.#gun.Firing = true;

        // if within distance of player, track at 80% speed until 3 seconds behind player
        // if within 3 seconds of player, track speed, limiting to player's speed
        // if more than 3 seconds behind, go at max speed to try and catch

        // limit the target speed based on the angle to player, as above

        // the "target" should be 3 seconds behind the player or 100 units behind the player, whichever is bigger.

        // assumptions for this state are that the enemy is behind the player and that the player is not facing the enemy (otherwise would be evading or sentry mode)

        let targetPos = this.#getFollowTargetPos(0.5, 100);
        
        // if approaching the player faster than they are moving and going to collide soon, or within min distance of player, track them 
        if (this.#getTimeToPos(targetPos) < 1.5 || this.#currDistToPlayer < 100) {
        // if (this.#getTimeToPos(targetPos) < 0.5 || this.#currDistToPlayer < 100) {
            this.#clone.lookAt(this.#playerRef.Position);

            this.#targetSpeed = UTILS.LimitToRange(this.#playerRef.Speed, 0, this.#maxSpeed);
        }
        else {
            this.#clone.lookAt(targetPos);

            this.#targetSpeed = this.#maxSpeed;

            let angleToTarget = this.#getAngleToPoint(targetPos);

            //asymptote of < 0.3 graph
            if (angleToTarget < 0.07) {
                this.#targetSpeed = this.#maxSpeed;
            }
            else if (angleToTarget <= 0.3) {

                this.#targetSpeed = 10 / (angleToTarget - 0.07) + 10;
            }
            //0.74 is the asymptote of >0.3 graph, after that point it crosses to high numbers again
            else if (angleToTarget < 0.74) {
                this.#targetSpeed = 10 / (angleToTarget - 0.74) + 76;
            }
            //if it crosses the asymptote, set it to the minimum
            else {
                this.#targetSpeed = 10;
            }

            this.#targetSpeed = UTILS.LimitToRange(this.#targetSpeed, 10, this.#maxSpeed);


            this.#targetSpeed = this.#maxSpeed;
        }

        this._objectGroup.quaternion.slerp(this.#clone.quaternion, this.#turnAccel * dt);

        let accel = this.#targetSpeed < this.#currentSpeed
            ? this.#acceleration * 2
            : this.#acceleration * 2;

        this.#currentSpeed = THREE.Math.lerp(this.#currentSpeed, this.#targetSpeed, accel * dt);
        // console.log(this.#currentSpeed.toFixed(2));
        this._objectGroup.translateZ(this.#currentSpeed * dt);
    }

    #getFollowTargetPos = (seconds, minDist) => {
        let distBehindPlayer = Math.max(this.#playerRef.Speed * seconds, minDist);

        let backwards = new THREE.Vector3(0, 0, -(distBehindPlayer));
        return this.#playerRef.Object.localToWorld(backwards);
    }

    #getTimeToPos = (pos) => {
        return UTILS.SubVectors(pos, this.Position).length() / this.#currentSpeed;
    }

    #handleEvadeState = (dt) => {
        this.#gun.Firing = false;
        
        // assumptions for this state are that player is a) facing the enemy and b) chasing the enemy (not standing still or very far away)

        this.#evadeCounter += dt;
        if (this.#evadeCounter >= this.#evadeTimeLimit) {
            this.#evadeCounter = 0;
            this.#evadeTimeLimit = 1 + Math.random() * 4;
            this.#targetEvadeTurnAmts.set(Math.random() - 0.5, Math.random() - 0.5);
        }

        // accelerate to max speed
        this.#targetSpeed = this.#maxSpeed;

        if (this.#getAngleToPlayer() > 1) {
            this.#evadeTimeLimit = 1; //don't turn for too long
            // this.#targetEvadeTurnAmts.multiplyScalar(0.5);
        }

        this.#evadeTurnAmts.lerp(this.#targetEvadeTurnAmts, 0.7 * dt);

        this._objectGroup.rotateX(this.#evadeTurnAmts.x * dt);
        this._objectGroup.rotateY(this.#evadeTurnAmts.y * dt);

        this.#currentSpeed = THREE.Math.lerp(this.#currentSpeed, this.#targetSpeed, this.#acceleration * dt);
        this._objectGroup.translateZ(this.#currentSpeed * dt);
    }

    #handleCutoffState = (dt) => {
    }

    #handleSentryState = (dt) => {
        this.#gun.Firing = true;

        this.#clone.lookAt(this.#playerRef.Position);
        this._objectGroup.quaternion.slerp(this.#clone.quaternion, this.#turnAccel * 2.5 * dt);
        
        this.#currentSpeed = THREE.Math.lerp(this.#currentSpeed, 0, this.#acceleration * 2 * dt);
        this._objectGroup.translateZ(this.#currentSpeed * dt);
    }

    #getAngleToPlayer = () => {
        return this.#getAngleToPoint(this.#playerRef.Position);
    }

    #getPlayerAngleToEnemy = () => {
        let dirToEnemy = this.Position.sub(this.#playerRef.Position);
        let forward = new THREE.Vector3();
        this.#playerRef.Object.getWorldDirection(forward);

        return forward.angleTo(dirToEnemy);
    }

    #getAngleToPoint = (point) => {
        let dirToPoint = UTILS.SubVectors(point, this.Position);
        let forward = new THREE.Vector3();
        this._objectGroup.getWorldDirection(forward);

        return forward.angleTo(dirToPoint);
    }

    Main(dt) {
        this.#clone.position.copy(this.Position);

        this.#currDistToPlayer = this.#playerRef.Position.sub(this.Position).length();
        this.#currAngleToPlayer = this.#getAngleToPlayer();
        this.#currPlayerAngleToEnemy = this.#getPlayerAngleToEnemy();
        
        this.#determineCurrentState(dt);
        
        //act based on current state
        //DEBUG
        // this.#currentState = this.#states.IDLE;
        //END DEBUG
        switch (this.#currentState) {
            case this.#states.IDLE:
                break;
            case this.#states.PATROL:
                this.#handlePatrolState(dt);
                break;
            case this.#states.FOLLOW:
                this.#handleFollowState(dt);
                break;
            case this.#states.EVADE:
                this.#handleEvadeState(dt);
                break;
            case this.#states.CUTOFF:
                this.#handleFollowState(dt); //until cutoff handler implemented
                // this.#handleCutoffState(dt);
                break;
            case this.#states.SENTRY:
                this.#handleSentryState(dt);
        }

        this.#gun.Main(dt);
        this.#shield.Main(dt);

        let speedPct = this.#targetSpeed / this.#maxSpeed;
        this.#thrusterSystem.Speed = speedPct * 50;
        let newIntensity = speedPct * 7;
        this.#thrusterLight.intensity = newIntensity;
        this.#thrusterSystem.Main(dt);

        this.#circleSpriteTargetOpacity = this.#currDistToPlayer <= this.#circleSpriteVisibleDist ? 0 : 1;
        this.#circleSprite.material.opacity = THREE.Math.lerp(this.#circleSprite.material.opacity, this.#circleSpriteTargetOpacity, dt);
    }

    HitByBullet(damage) {
        this.#shield.Hit();
        this.#health -= damage; 
        console.log("Enemy: ",this.#health, this._objectGroup.uuid);
    }

    get Speed() {
        return this.#currentSpeed;
    }
}

export default EnemyObject;