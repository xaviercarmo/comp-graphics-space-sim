import * as THREE from '../libraries/three.module.js';
import * as INPUT from './input.js';
import * as UTILS from './utils.js';

import EnemyObject from './gameobjects/physicsobjects/enemy.js';

//handles the arena logic (spawning of enemies and items, round management etc.)
class ArenaHandler {
    #maxEnemies;
    #round = 0;
    #enemyPool = [];

    constructor(maxEnemies) {
        this.#maxEnemies = maxEnemies;
    }

    #spawnEnemies = (count) => {
        let result = [];

        let availableEnemies = this.#enemyPool.filter(enemy => !enemy.IsSpawned);

        if (count > availableEnemies.length) {
            console.warn('Not enough enemies in pool.');
            count = availableEnemies.length;
        }

        for (let i = 0; i < count; i++) {
            availableEnemies[i].Spawn();
            result.push(availableEnemies[i]);

            //get a random direction from the player
            let randDirection = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5);
            // window.GameHandler.Player.Object.localToWorld(randDirection);
            // console.log(randDirection.clone());
            randDirection.normalize();

            //warp in from 10,000 units away in that direction
            let startPoint = window.GameHandler.Player.Position.add(randDirection.clone().multiplyScalar(10000));
            let endPoint = window.GameHandler.Player.Position.add(randDirection.clone().multiplyScalar(40));
            // console.log(randDirection, startPoint, endPoint);


            availableEnemies[i].Warp(startPoint, endPoint);
        }

        return result;
    }

    Initialise() {
        for (let i = 0; i < this.#maxEnemies; i++) {
            let newEnemy = new EnemyObject();
            window.GameHandler.Scene.add(newEnemy.Object);
            newEnemy.Object.visible = false;

            this.#enemyPool.push(newEnemy);
        }
    }

    Main(dt) {
    }

    Test() {
        this.#spawnEnemies(5);
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

        window.setTimeout(() => newEnemies.forEach(enemy => enemy.ClearStateOverride()), 3000);
    }

    ReturnLight(light) {
        light.isTaken = false;
    }
}

export default ArenaHandler;