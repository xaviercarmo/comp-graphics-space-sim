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
            let particlePos = this.#particle[i].Position;

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

            //if (!frustum.containsPoint(particlePos) && playerPos.distanceTo(particlePos) > 50 ){
            //If object is far enough, move it in front of player
            if (playerPos.distanceTo(particlePos) > 70 ){
                this.#particle[i].Particle.position.copy(frontPos);
            }
        }

    }

}

class SpawnParticle {
    #parent;
    #texture;
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

        //random spawn
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
        window.GameHandler.Scene.add(this.#part);
    }
    
    get Particle() {
        return this.#part; 
    }
    get Position() {
        return this.#part.position; 
    }

}

export default AlternateParticle; 