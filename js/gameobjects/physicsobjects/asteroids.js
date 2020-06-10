import * as THREE from '../../../libraries/three.module.js';
import * as INPUT from '../../input.js';
import * as UTILS from '../../utils.js';

import GameHandler from '../../gamehandler.js';
import PhysicsObject from '../physics.js';
import Shield from '../../shield.js';

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
    //icosaherdon geo
    //procedurally generate via perlin noise
    //randomise shape/size of object.

    //temp - not sure if needed yet. 
    #asteroid;
    #rotDir; 
    #random;
    #player;
    #camera;
    #helper;
    #farEnough = false; 


    constructor() {
        //random asteroid selection.
        let indexNo = THREE.MathUtils.randInt(1,4);
        let asteroid; 
        if (indexNo == 1) {
            asteroid = window.GameHandler.AssetHandler.LoadedAssets.asteroid1.clone(); 
        }else if (indexNo == 2) {
            asteroid = window.GameHandler.AssetHandler.LoadedAssets.asteroid2.clone(); 
        }else if (indexNo == 3) {
            asteroid = window.GameHandler.AssetHandler.LoadedAssets.asteroid8.clone(); 
        }else if (indexNo == 4) {
            asteroid = window.GameHandler.AssetHandler.LoadedAssets.asteroid9.clone(); 
        }
        
        

        //radomise size of each asteroid. 
        asteroid.scale.set(
            THREE.MathUtils.randFloat(200, 200),
            THREE.MathUtils.randFloat(200, 200),
            THREE.MathUtils.randFloat(200, 200)
        );
        
        //location spawn around player with within 400 unit distance. 
        let spawnPoint = new THREE.Vector3(
            THREE.MathUtils.randInt(-400, 400),
            THREE.MathUtils.randInt(-400, 400),
            THREE.MathUtils.randInt(-400, 400)
        );
        let pPos = window.GameHandler.Player.Object.position.clone();
        let newPos = pPos.add(spawnPoint);
        asteroid.position.copy(newPos);
        
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
        this._mainObject.position.add(this.#random);
    }

    #ParameterSetup = () => {
        //
        //object rotation
        this.#rotDir = THREE.MathUtils.randFloat(-0.005, 0.005);;

        //object movement along xyz
        this.#random = new THREE.Vector3(
            THREE.MathUtils.randFloat(-0.05, 0.05),
            THREE.MathUtils.randFloat(-0.05, 0.05),
            THREE.MathUtils.randFloat(-0.05, 0.05)
        );
    }
    

    #collisionDetection = () => {
        //console.log(this._mainObject.position);
        //console.log(playerPos);
        let vec = new THREE.Vector3();
        let camDir = this.#camera.getWorldDirection(vec);
        let distance = 80; 
        let playerToAst = this.#player.Position.distanceToSquared(this._mainObject.position); 
        //console.log(playerToAst);
        let playerPos = this.#player.Object.position.clone();
        let pSpeed = this.#player.Speed;
        /*
        this.#player.Object.geometry.computeBoundingSphere(); 
        this._mainObject.geometry.computeBoundingSphere()
        this.#player.updateMatrixWorld();
        this._mainObject.updateMatrixWorld();
        */

        if(playerToAst < distance) {
            let newPos = new THREE.Vector3(
                this._mainObject.position.x + camDir.x*0.25,
                this._mainObject.position.y + camDir.y*0.25,
                this._mainObject.position.z + camDir.z*0.25
            );

            let camDire = new THREE.Vector3(
                camDir.x*pSpeed * 0.01,
                camDir.y*pSpeed * 0.01,
                camDir.z*pSpeed * 0.01
            );

            this.#random = camDire;
            this._mainObject.position.copy(newPos);
        } 

        let travelDist = Math.pow(distance, 2) * 3
        if(playerToAst > travelDist) {
            this.#random = new THREE.Vector3(
                THREE.MathUtils.randFloat(-0.05, 0.05),
                THREE.MathUtils.randFloat(-0.05, 0.05),
                THREE.MathUtils.randFloat(-0.05, 0.05)
            );
        }
                
    
        //console.log(this.#player);
        /*
        if( playerToAst < distance && this.#farEnough == false) {
            //Pushes object forward with repsect to camera direction
            //note since updates are called so quickly, it looks like its shifting away.
            //added random numbers to make it less consistent.
            //will need to change to more realistic way. 
                
                let newPos = new THREE.Vector3(
                    this._mainObject.position.x + camDir.x*2,
                    this._mainObject.position.y + camDir.y*2,
                    this._mainObject.position.z + camDir.z*2
                );
                this._mainObject.position.copy(newPos);
                if(playerToAst > distance * 9) {
                    this.#farEnough = true; 
                } else {
                    this.#farEnough = false;
                }
            
  
            
            //mainobject doesn't work, 
            //scene.remove() only works if the object is a direct child of scene
            
        } */
        if (playerToAst > distance * 20000) { //since distance squared is so large. 
            //console.log(window.GameHandler.Scene.getObjectById( this._mainObject.id));
            console.log(playerToAst);
            //console.log(distanceSq*10000);

            //remove object, but how to make them spawn efficiently
            //window.GameHandler.Scene.remove(this._objectGroup);
            //for now just move them
            
            let spawnPoint = new THREE.Vector3(
            UTILS.RandomFloatInRange(-400, 400),
            UTILS.RandomFloatInRange(-400, 400),
            UTILS.RandomFloatInRange(-400, 400)
            );
            spawnPoint.clampLength(-400, 400);
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

}

export default AsteroidField;