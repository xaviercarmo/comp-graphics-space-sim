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
    #playerId; 

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
        this.#playerId = asteroid.id; 
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
        /*
        this.#player.Object.geometry.computeBoundingSphere(); 
        this._mainObject.geometry.computeBoundingSphere()
        this.#player.updateMatrixWorld();
        this._mainObject.updateMatrixWorld();
        */

        //console.log(this.#player);
        if( playerToAst < distance) {
            //Pushes object forward with repsect to camera direction
            //note since updates are called so quickly, it looks like its shifting away.
            //added random numbers to make it less consistent.
            //will need to change to more realistic way. 
            let newPos = new THREE.Vector3(
                this._mainObject.position.x + camDir.x* + THREE.MathUtils.randFloat(0, 2),
                this._mainObject.position.y + camDir.y* + THREE.MathUtils.randFloat(0, 2),
                this._mainObject.position.z + camDir.z* + THREE.MathUtils.randFloat(0, 2)
            );
  
            this._mainObject.position.copy(newPos);
            //mainobject doesn't work, 
            //scene.remove() only works if the object is a direct child of scene
            
    
        } if (playerToAst > distance * 50000) { //since distance squared is so large. 
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
            let pPos = window.GameHandler.Player.Object.position.clone();
            let newPos = pPos.add(spawnPoint);
            this._mainObject.position.copy(newPos);
        }
    }
    
    get Asteroid(){
        return this._mainObject;
    }

}

export default AsteroidField;