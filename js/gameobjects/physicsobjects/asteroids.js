import * as THREE from '../../../libraries/three.module.js';
import * as INPUT from '../../input.js';
import * as UTILS from '../../utils.js';

import GameHandler from '../../gamehandler.js';
import PhysicsObject from '../physics.js';
import { ThrusterParticleSystemGlobalPos } from '../../particlesystems/thrusterparticlesystem.js';

class AsteroidField {
    //IMPLEMENT THE FIELD GENERATION HERE. 
    #asteroids = [];
    #number;
    
    
    constructor(number){
        this.#number = number; 
        
        this.#Initialise(); 
        
    }
    Main(dt) {
        
    }

    //Implement a position changer 

    #Initialise = () => {
        this.#SpawnMultipleAsteroids(this.#number);
        
    }

    #SpawnMultipleAsteroids = (num) => {
        for(let i = 0; i < num; i++) {
            this.#asteroids[i] = new AsteroidObject();
            window.GameHandler.AddGameObject(this.#asteroids[i]); 
            
        }
    }

}
class AsteroidObject extends PhysicsObject {
    #rotDir; 
    #random;
    #player;
    #camera;
    #hit = false; 

    constructor() {
        //random asteroid selection.
        let indexNo = THREE.MathUtils.randInt(1,4);
        let asteroid; 
        if (indexNo == 1) {
            asteroid = window.GameHandler.AssetHandler.LoadedAssets.asteroid1.clone(); 
            asteroid.children[0].material.map = window.GameHandler.AssetHandler.LoadedImages.sprites.asteroid1;
            asteroid.children[0].material.needsUpdate = true; 
        }else if (indexNo == 2) {
            asteroid = window.GameHandler.AssetHandler.LoadedAssets.asteroid2.clone(); 
            asteroid.children[0].material.map = window.GameHandler.AssetHandler.LoadedImages.sprites.asteroid2;
            asteroid.children[0].material.needsUpdate = true; 
        }else if (indexNo == 3) {
            asteroid = window.GameHandler.AssetHandler.LoadedAssets.asteroid8.clone(); 
            asteroid.children[0].material.map = window.GameHandler.AssetHandler.LoadedImages.sprites.asteroid3;
            asteroid.children[0].material.needsUpdate = true; 
        }else if (indexNo == 4) {
            asteroid = window.GameHandler.AssetHandler.LoadedAssets.asteroid9.clone(); 
            asteroid.children[0].material.map = window.GameHandler.AssetHandler.LoadedImages.sprites.asteroid4;
            asteroid.children[0].material.needsUpdate = true; 
        }
        
        //radomise size of each asteroid. 
        asteroid.scale.set(200, 200, 200);

        //location spawn around (sphere range) player with within 500 unit distance. 
        let origin = new THREE.Vector3(0, 0 , 50); //some random point you choose.

        //math.random() returns value between 0 and < 1
        //convert vector to unit vector 
        //multiply by random()*500 to generate the xyz positions. 
        let ranPos = new THREE.Vector3(
            Math.random() - 0.5,
            Math.random() - 0.5,
            Math.random() - 0.5
        ).normalize().multiplyScalar(Math.random() * 500); 
        origin.add(ranPos);
        asteroid.position.copy(origin);
        
        super(asteroid);
        this._objectGroup.frustumCulled = true; 
        this.#camera = window.GameHandler.Camera;
        this.#player = window.GameHandler.Player;
        this.#ParameterSetup();
   
    }

    Main(dt){
        super.Main(dt);
        this.#AsteroidRotation(); 
        this.#AutoMovement();
        this.#collisionDetection(); 
    }
    
    #AsteroidRotation = () => {
        this._mainObject.rotation.y += this.#rotDir;//this.#randFloat;
    }

    #AutoMovement = () => {
        //increment positional changes
        //let change = this.#random; 
        this._mainObject.position.add(this.#random);
    }

    #ParameterSetup = () => {
        //object rotation
        this.#rotDir = THREE.MathUtils.randFloat(-0.005, 0.005);

        //object movement along xyz
        this.#random = new THREE.Vector3(
            THREE.MathUtils.randFloat(-0.05, 0.05),
            THREE.MathUtils.randFloat(-0.05, 0.05),
            THREE.MathUtils.randFloat(-0.05, 0.05)
        );
    }
    

    #collisionDetection = () => {
        let vec = new THREE.Vector3();
        let camDir = this.#camera.getWorldDirection(vec);
        let distance = 80; 
        let playerToAst = this.#player.Position.distanceToSquared(this._mainObject.position); 
        let playerPos = this.#player.Object.position.clone();
        let pSpeed = this.#player.Speed;
        let travelDist = Math.pow(distance, 2) * (pSpeed * 2);

        if(playerToAst < distance) {
            let camDire = new THREE.Vector3(
                camDir.x*pSpeed * 0.017,
                camDir.y*pSpeed * 0.017,
                camDir.z*pSpeed * 0.017
            );
            //Change the speed of automovement()
            this.#random = camDire;

            //trigger player shield
            this.#player.Hit(); 
            this.#hit = true; 
        } else if (playerToAst > travelDist && this.#hit) {
            //reset speed of asteroid. 
            console.log("asteroid far");
            this.#random = new THREE.Vector3(
                THREE.MathUtils.randFloat(-0.05, 0.05),
                THREE.MathUtils.randFloat(-0.05, 0.05),
                THREE.MathUtils.randFloat(-0.05, 0.05)
            );
            this.#hit = false; 
        }
        

        //move asteroid if far enough
        if (playerToAst > distance * 20000) { //since distance squared is so large. 
            console.log(playerToAst);
            
            let spawnPoint = new THREE.Vector3(
                Math.random() - 0.5,
                Math.random() - 0.5,
                Math.random() - 0.5
            ).normalize().multiplyScalar(Math.random() * 500);
        
            let frontPos = new THREE.Vector3; 
            //multiply by arbitrary number for distance, note: higher it is more vertically displaced it gets. 
            frontPos.set(playerPos.x + camDir.x *800, playerPos.y + camDir.y*800, playerPos.z + camDir.z *800);

            //Randomise object spawn
            frontPos.add(spawnPoint);
            let newPos = playerPos.add(spawnPoint);
            this._mainObject.position.copy(newPos);
        }
    }
    
    get Asteroid(){
        return this._mainObject;
    }

    get Position(){
        return this._mainObject.position; 
    }

    set Position(Vector3){
        this._mainObject.position.copy(Vector3); 
    }

}

export default AsteroidField;