import * as THREE from '../libraries/three.module.js';
import * as INPUT from './input.js';
import * as UTILS from './utils.js';

import EnemyObject from './gameobjects/physicsobjects/enemy.js';
import HealthCapsule from './gameobjects/healthcapsule.js';

//handles the arena logic (spawning of enemies and items, round management etc.)
//this gets created before the GameHandler is initialised, so most constructor
//activities are deferred to the Initialise() method.
class ArenaHandler {
    #maxEnemies;
    #round = 0;
    #enemyPool = [];

    #isNewRound = true;
    #roundCountdown = 0;
    #roundCountdownDuration = 3;
    #countdownBuffer = 0;
    #countdownBufferDuration = 0.5;
    
    #healthCapsule;

    constructor(maxEnemies) {
        this.#maxEnemies = maxEnemies;
    }

    #spawnEnemies = (count) => {
        let result = [];

        let availableEnemies = this.#getAvailableEnemies();

        if (count > availableEnemies.length) {
            console.warn('Not enough enemies in pool.');
            count = availableEnemies.length;
        }

        for (let i = 0; i < count; i++) {
            availableEnemies[i].Spawn();
            result.push(availableEnemies[i]);

            //get a random direction
            let randDirection = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();

            //warp in from 10,000 units away in that direction
            let startPoint = window.GameHandler.Player.Position.add(randDirection.clone().multiplyScalar(10000));
            let endPoint = window.GameHandler.Player.Position.add(randDirection.clone().multiplyScalar(50 + Math.random() * 1000));

            availableEnemies[i].Warp(startPoint, endPoint);
        }

        return result;
    }

    #spawnHealthCapsule = () => {
        let randDirection = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();
        let spawnPos = window.GameHandler.Player.Position.add(randDirection.multiplyScalar(50 + Math.random() * 150));

        this.#healthCapsule.Spawn(spawnPos);
    }

    #getAvailableEnemies = () => {
        return this.#enemyPool.filter(enemy => !enemy.IsSpawned);
    }

    Initialise() {
        for (let i = 0; i < this.#maxEnemies; i++) {
            let newEnemy = new EnemyObject();
            window.GameHandler.Scene.add(newEnemy.Object);
            newEnemy.Object.visible = false;

            this.#enemyPool.push(newEnemy);
        }

        this.#healthCapsule = new HealthCapsule();
    }

    Main(dt) {
        if (this.#round > 0) {
            // if counting down, update the gui
            if (this.#roundCountdown > 0) {
                this.#countdownBuffer += dt;

                if (this.#countdownBuffer >= this.#countdownBufferDuration){
                    this.#roundCountdown -= dt;
                    $('#countDownContent').text(Math.round(this.#roundCountdown));
                }
            }
            // otherwise
            else {
                let availableEnemies = this.#getAvailableEnemies();
                
                // if there are no enemies currently, then either a round has just ended, or one is about to begin
                if (availableEnemies.length == this.#maxEnemies) {
                    // if a round was just completed, start the timer
                    if (this.#isNewRound) {
                        this.#isNewRound = false;
                        this.#countdownBuffer = 0;

                        this.#roundCountdown = this.#roundCountdownDuration;
                        $('#countDownContainer').removeClass('count-down-base-container-hidden');
                        $('#countDownContent').text(this.#roundCountdown);
                    }
                    // otherwise the timer has just completed, so increment round, remove the timer, and spawn enemies/health capsule
                    else {
                        this.#isNewRound = true;
                        this.#round++;
                        $('#countDownContainer').addClass('count-down-base-container-hidden');

                        let numEnemiesToSpawn = Math.min(3 + Math.floor(this.#round / 2), this.#maxEnemies);
                        this.#spawnEnemies(numEnemiesToSpawn);

                        if (this.#round % 5 == 0 && !this.#healthCapsule.IsSpawned) {
                            this.#spawnHealthCapsule();
                        }
                    }
                }
            }

            if (this.#healthCapsule.IsSpawned) {
                this.#healthCapsule.Main(dt);
            }
        }
    }

    StartFirstRound() {
        this.#round = 1;

        let forward = new THREE.Vector3();
        window.GameHandler.Player.Object.getWorldDirection(forward);
        
        let startPoint = window.GameHandler.Player.Position.add(forward.clone().multiplyScalar(10000));
        let endPoint = window.GameHandler.Player.Position.add(forward.clone().multiplyScalar(40));
        let perpVec = UTILS.SubVectors(endPoint, startPoint).cross(new THREE.Vector3(0, 1, 0)).normalize().multiplyScalar(20);

        let newEnemies = this.#spawnEnemies(3);
        newEnemies.forEach(enemy => {
            enemy.OverrideState('IDLE');
        });

        newEnemies[0].Warp(startPoint, endPoint);
        newEnemies[1].Warp(startPoint, UTILS.AddVectors(endPoint, perpVec));
        newEnemies[2].Warp(startPoint, UTILS.SubVectors(endPoint, perpVec));

        window.setTimeout(() => newEnemies.forEach(enemy => enemy.ClearStateOverride()), 2000);
    }

    ReturnLight(light) {
        light.isTaken = false;
    }
}

export default ArenaHandler;