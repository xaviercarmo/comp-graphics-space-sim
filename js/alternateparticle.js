import * as THREE from '../libraries/three.module.js';
import * as UTILS from './utils.js';
import GameObject from './gameobject.js';

class AlternateParticle {
    #parent;
    #texture;
    #numParticles;
    #obstacle = []; 
    #camera; 

    constructor(parent, texture, maxParticles, camera){
        this.#parent = parent; 
        this.#texture = texture;
        this.#numParticles = maxParticles;
        this.#camera = camera; 

        this.#Initialise(); 
    }

    Main(dt) {
        this.#SpawnNewObstacles(); 
    }

    #Initialise = () => {
        this.#SpawnParticles(this.#numParticles);
    }

    #SpawnParticles = (numPart) => {
        //generat n obstacles
        for (let i = 0; i < numPart; i++) {
            this.#obstacle[i] = new SpawnParticle(this.#parent, this.#texture); 
            //console.log(i, "index", this.#obstacle[i].Position);
        } 
    }
    
    #SpawnNewObstacles = () => {
        for (let i = 0; i < this.#obstacle.length; i++) {
            //store obstacle position
            let x = this.#obstacle[i].Particle.position.x, 
                y = this.#obstacle[i].Particle.position.y, 
                z = this.#obstacle[i].Particle.position.z;
            let obstPos = new THREE.Vector3(x,y,z);

            //random spawn range per axis -- for respawning
            let rx = THREE.MathUtils.randFloat(-50, 50),
                ry = THREE.MathUtils.randFloat(-50, 50),
                rz = THREE.MathUtils.randFloat(-50, 50);
            let ranPos = new THREE.Vector3(rx, ry, rz);

            //set spawn in front of player 
            //Get direction of camera and add it to player position
            let playerPos = this.#parent.position; 
            let vec = new THREE.Vector3(); 
            let camDir = this.#camera.getWorldDirection(vec);
            

            //position in front of player
            let frontPos = new THREE.Vector3; 
            //multiply by arbitrary number for distance, note: higher it is more vertically displaced it gets. 
            frontPos.set(playerPos.x + camDir.x *50, playerPos.y + camDir.y*50, playerPos.z + camDir.z *50);
            //Randomise object spawn
            frontPos.add(ranPos);

            //determine if current object is within camera view
            //**Not really checking for objects behind player
            //try the check if object is within the cloud range. 
            this.#camera.updateMatrix();
            this.#camera.updateMatrixWorld(); 
            let frustum = new THREE.Frustum();
            frustum.setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(this.#camera.projectionMatrix, this.#camera.matrixWorldInverse));

            //if coordinates of current object is not within camera's view.
            //and if the object is close enough while the player turns the camera, the object won't move. 
            if (!frustum.containsPoint(obstPos) && playerPos.distanceTo(obstPos) > 50){
                this.#obstacle[i].Particle.position.copy(frontPos);
            }
        }

    }

}

class SpawnParticle {
    #parent;
    #texture;
    #position
    #obst; 

    constructor(parent, texture){
        this.#parent = parent; 
        this.#texture = texture;
        this.#initialise(); 
    }
    #initialise = () => {
        /*
        let rad = THREE.MathUtils.randInt(5, 20);
        let det = THREE.MathUtils.randInt(1, 3);
    
        let geo = new THREE.IcosahedronGeometry(rad, det);
        let mat = new THREE.MeshBasicMaterial( { map: this.#texture});
        this.#obst = new THREE.Mesh(geo, mat);
        */
        let spriteMaterial = new THREE.SpriteMaterial({map: this.#texture});
        this.#obst = new THREE.Sprite(spriteMaterial);
        
        //random spawn
        //Random range via random int per axis.
        let x = THREE.MathUtils.randFloat(-50, 50);
        let y = THREE.MathUtils.randFloat(-50, 50);
        let z = THREE.MathUtils.randFloat(-50, 50);
        let ranPos = new THREE.Vector3(x, y, z);
        //ranPos.clampLength(-100, 100); //creates spherical range

        //Setting spawn range around player position.
        //add the position onto existing player position?
        let newPos = this.#parent.position.add(ranPos); //vector3
        
        //Set new position and add object to scene
        this.#obst.scale.set(0.4, 0.4, 1);
        this.#obst.position.copy(newPos); 
        this.#position = this.#obst.position; 

        //console.log(this.#obst.position);
        //console.log("position of obst",this._mainObject.position, );
        window.GameHandler.Scene.add(this.#obst);

    }
    
    get Particle() {
        return this.#obst; 
    }
    get Position() {
        return this.#position; 
    }

}

export default AlternateParticle; 