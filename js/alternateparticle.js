import * as THREE from '../libraries/three.module.js';
import * as UTILS from './utils.js';
import GameObject from './gameobject.js';

class AlternateParticle {
    #parent;
    #texture;
    #numParticles;
    #particle = []; 
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
            this.#particle[i] = new SpawnParticle(this.#parent, this.#texture); 
        } 
    }
    
    #SpawnNewObstacles = () => {
        for (let i = 0; i < this.#particle.length; i++) {
            //store particle position
            let x = this.#particle[i].Particle.position.x, 
                y = this.#particle[i].Particle.position.y, 
                z = this.#particle[i].Particle.position.z;
            let partPos = new THREE.Vector3(x,y,z);

            //random spawn range per axis -- for respawning
            let rx = THREE.MathUtils.randFloat(-50, 50),
                ry = THREE.MathUtils.randFloat(-50, 50),
                rz = THREE.MathUtils.randFloat(-50, 50);
            let ranPos = new THREE.Vector3(rx, ry, rz);

            //set spawn in front of player 
            let playerPos = this.#parent.position; 
            let vec = new THREE.Vector3(); 
            let camDir = this.#camera.getWorldDirection(vec);
            
            //position in front of player
            let frontPos = new THREE.Vector3; 
            //multiply by arbitrary number for distance, note: higher it is, more vertically displaced it gets. 
            frontPos.set(playerPos.x + camDir.x *100, playerPos.y + camDir.y*100, playerPos.z + camDir.z *100);
            frontPos.add(ranPos);

            //determine if current object is within camera view
            let frustum = new THREE.Frustum();
            frustum.setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(this.#camera.projectionMatrix, this.#camera.matrixWorldInverse));

            //if coordinates of current object is not within camera's view.
            //and if the object is close enough while the player turns the camera, the object won't move.
            if (!frustum.containsPoint(partPos) && playerPos.distanceTo(partPos) > 50 ){
                this.#particle[i].Particle.position.copy(frontPos);
            }
        }

    }

}

class SpawnParticle {
    #parent;
    #texture;
    #position
    #part; 

    constructor(parent, texture){
        this.#parent = parent; 
        this.#texture = texture;
        this.#initialise(); 
    }
    #initialise = () => {
        let rad = THREE.MathUtils.randFloat(1, 5);
        let det = THREE.MathUtils.randInt(1, 3);
    
        let geo = new THREE.IcosahedronGeometry(rad, det);
        //lambertian for matte/diffuse reflections
        let mat = new THREE.MeshLambertMaterial( { map: this.#texture});
        this.#part = new THREE.Mesh(geo, mat);
        this.#part.scale.set(0.03, 0.03, 0.03);
        //let spriteMaterial = new THREE.SpriteMaterial({map: this.#texture});
        //this.#part = new THREE.Sprite(spriteMaterial);

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
        this.#part.position.copy(newPos); 
        this.#position = this.#part.position; 

        //console.log(this.#obst.position);
        //console.log("position of obst",this._mainObject.position, );
        window.GameHandler.Scene.add(this.#part);
    }
    
    get Particle() {
        return this.#part; 
    }
    get Position() {
        return this.#position; 
    }

}

export default AlternateParticle; 