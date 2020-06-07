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
        asteroid.position.add(new THREE.Vector3(
            THREE.MathUtils.randInt(-200, 200),
            THREE.MathUtils.randInt(-200, 200),
            THREE.MathUtils.randInt(-200, 200)
        ));
        super(asteroid);
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
            THREE.MathUtils.randFloat(-0.01, 0.01),
            THREE.MathUtils.randFloat(-0.01, 0.01),
            THREE.MathUtils.randFloat(-0.01, 0.01)
        );
    }
    

    #collisionDetection = () => {
        //console.log(this._mainObject.position);
        //console.log(playerPos);
        let vec = new THREE.Vector3();
        let camDir = this.#camera.getWorldDirection(vec);
        let distance = 80; 
        /*
        this.#player.Object.geometry.computeBoundingSphere(); 
        this._mainObject.geometry.computeBoundingSphere()
        this.#player.updateMatrixWorld();
        this._mainObject.updateMatrixWorld();

        let box1 = this.#player.geometry.boundingSphere.clone();
        box1.applyMatrix4(this.#player.matrixWorld);

        var box2 = this._mainObject.geometry.boundingSphere.clone();
        box2.applyMatrix4(this._mainObject.matrixWorld);

        if(box1.intersectsSphere(box2)) {
            console.log("Collision Occured");
        }*/

        console.log(this.#player);
        if(this.#player.Position.distanceToSquared(this._mainObject.position) < distance) {
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
        } 
    }
    
    get Asteroid(){
        return this._mainObject;
    }

}

export default AsteroidField;