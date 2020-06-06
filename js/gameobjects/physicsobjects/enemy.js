import * as THREE from '../../../libraries/three.module.js';
import * as INPUT from '../../input.js';
import * as UTILS from '../../utils.js';

import PhysicsObject from '../physics.js';

import { ThrusterParticleSystemLocalPos } from '../../particlesystems/thrusterparticlesystem.js';
import { Gun } from '../../gun.js';

class EnemyObject extends PhysicsObject {
    #playerRef = window.GameHandler.Player;
    #forward = new THREE.Vector3(0, 0, 1);

    #clone;
    #currentSpeed = 0;
    #targetSpeed = 0;
    #maxSpeed = 800;
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
        PATROL: 'patrol',
        FOLLOW: 'follow',
        CUTOFF: 'cutoff',
        EVADE: 'evade',
        SENTRY: 'sentry'
    }
    #currentState;

    constructor() {
        super(window.GameHandler.AssetHandler.LoadedAssets.enemy_ship.clone());

        this.#clone = this._objectGroup.clone(false);

        this.#setupModel();
        this.#setupSprites();

        // let bulletGeo = new THREE.SphereBufferGeometry(50, 30, 30);
        // let bulletMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        // this.testObj = new THREE.Mesh(bulletGeo, bulletMat);
        // window.GameHandler.Scene.add(this.testObj);
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
                if (this.#currDistToPlayer < 200) {
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
        if (UTILS.SubVectors(this.#currentPatrolWaypoint, this.Position).lengthSq() < 50 * 50) {
            this.#currentPatrolWaypoint = this.#generateNewWaypoint();
            // this.testObj.position.copy(this.#currentPatrolWaypoint);
        }

        this.#clone.lookAt(this.#currentPatrolWaypoint);
        this._objectGroup.quaternion.slerp(this.#clone.quaternion, this.#turnAccel * dt);

        this.#targetSpeed = this.#maxSpeed / 1;
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
        
    }

    #handleEvadeState = (dt) => {
    }

    #handleCutoffState = (st) => {
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
        this.#currentState = this.#states.FOLLOW;
        //END DEBUG
        switch (this.#currentState) {
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
                this.#handleCutoffState(dt);
        }

        // console.log(this.#currentState);

        this.#circleSpriteTargetOpacity = this.#currDistToPlayer <= this.#circleSpriteVisibleDist ? 0 : 1;
        this.#circleSprite.material.opacity = THREE.Math.lerp(this.#circleSprite.material.opacity, this.#circleSpriteTargetOpacity, dt);
    }

    // Main(dt) {
    //     // this.#clone.lookAt(this.testObj.position);
    //     this.#clone.position.copy(this.Position);
    //     this.#clone.lookAt(this.#playerRef.Position);
    //     this._objectGroup.quaternion.slerp(this.#clone.quaternion, this.#turnAccel * dt);

    //     //could also just do (if dist > min dist) -> accel else -> deccel
    //     let maxSpeed = this.#maxSpeed;

    //     let distToPlayerSq = this.#playerRef.Position.sub(this.Position).lengthSq();
    //     // console.log(this.#playerRef.Position.sub(this.Position).length());
    //     //if close to the player, then try to track
    //     if (distToPlayerSq <= this.#minDistToPlayerSq) {
    //         maxSpeed = Math.round(this.#playerRef.Speed);
    //     }
    //     else {
    //         //limit the maxSpeed based on the angle to the player - a larger angle to player means we want a sharper turn, so slow down
    //         let dirToPlayer = UTILS.SubVectors(this.#playerRef.Position, this.Position);
    //         let forward = new THREE.Vector3();
    //         this._objectGroup.getWorldDirection(forward);
    //         //what i want: as angle approaches half pi, speed should approach zero
    //         let angle = forward.angleTo(dirToPlayer);

    //         maxSpeed *= UTILS.LimitToRange((1 / angle) - 0.637, 0, 1);
    //     }

    //     // maxSpeed *= (Math.PI - Math.abs(angle)) / Math.PI;
    //     // console.log((Math.PI - Math.abs(angle)) / Math.PI);
    //     // console.log((1 / angle) - 0.637);

    //     this.#targetSpeed = (distToPlayerSq - this.#minDistToPlayerSq) * maxSpeed;
    //     this.#targetSpeed = UTILS.LimitToRange(this.#targetSpeed, 0, maxSpeed);
        
    //     // console.log(this.#targetSpeed);
    //     this.#currentSpeed = THREE.Math.lerp(this.#currentSpeed, this.#targetSpeed, this.#acceleration * dt);
    //     // console.log(this.#currentSpeed);
    //     this._objectGroup.translateZ(this.#currentSpeed * dt);

        
    //     // this._objectGroup.worldToLocal(dirToPlayer);

    //     // let forward = this.#forward.clone();

    //     // console.log(angle * 180 / Math.PI);

    //     // var mx = new THREE.Matrix4().lookAt(dirToPlayer, new THREE.Vector3(0,0,0), new THREE.Vector3(0,1,0));
    //     // var qt = new THREE.Quaternion().setFromRotationMatrix(mx);
    //     // this._objectGroup.quaternion.rotateTowards(qt, 1 * dt);

    //     //this._objectGroup.lookAt(this.#playerRef.Position);

    //     let moveVec = new THREE.Vector3();
    //     if (INPUT.KeyPressed("w")) {
    //         moveVec.z = 0.1;
    //     }
    //     if (INPUT.KeyPressed("a")) {
    //         moveVec.x = 0.1;
    //     }
    //     if (INPUT.KeyPressed("s")) {
    //         moveVec.z = -0.1;
    //     }
    //     if (INPUT.KeyPressed("d")) {
    //         moveVec.x = -0.1;
    //     }
    //     if (INPUT.KeyPressed("r")) {
    //         moveVec.y = 0.1;
    //     }
    //     if (INPUT.KeyPressed("f")) {
    //         moveVec.y = -0.1;
    //     }

    //     this.testObj.position.add(moveVec);

    //     this.#circleSpriteTargetOpacity = distToPlayerSq <= 100 * 100 ? 0 : 1;
    //     this.#circleSprite.material.opacity = THREE.Math.lerp(this.#circleSprite.material.opacity, this.#circleSpriteTargetOpacity, dt);
    // }
}

export default EnemyObject;