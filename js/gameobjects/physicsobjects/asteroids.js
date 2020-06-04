import * as THREE from '../../../libraries/three.module.js';
import * as INPUT from '../../input.js';
import * as UTILS from '../../utils.js';

import GameHandler from '../../gamehandler.js';
import PhysicsObject from '../physics.js';
import { FBXLoader } from '../../../libraries/FBXLoader.js';

class AsteroidObject extends PhysicsObject {
    //icosaherdon geo
    //procedurally generate via perlin noise
    //randomise shape/size of object.

    //temp - not sure if needed yet. 
    #asteroid;
    #rotDir; 
    #random;   

    constructor() {
        let rad = 5;
        let det = THREE.MathUtils.randInt(1,3);
        let numObjects = 10;

        let geo = new THREE.IcosahedronGeometry(rad, det);
        //lambertian better for matte surfaces, ideal for stone not shiny surfaces
        let mat = new THREE.MeshLambertMaterial({ color: 0xb7b1ab});
        let obj = new THREE.Mesh(geo, mat);
        obj.position.copy( new THREE.Vector3(10, 10, 10));
        super(obj);
        
        const loader = new FBXLoader();
        loader.load('../../../assets/asteroids/asteroid1.fbx', function(fbx) {
            fbx.scale.set(100,100,100);
            fbx.position.x += 20; 
            window.GameHandler.Scene.add(fbx);
        });
        
        this.#ParameterSetup();
        /*
        //Generates a circular field of asteroids 
        //Doesn't get passed into super class, so won't count as mainObject? 
        for (var i = 0; i < numObjects; i++) {
            let theta = i * 2 * Math.PI / numObjects;
            let x = Math.sin(theta)*rad*10;
            let y = Math.cos(theta)*rad*10;
            let z = Math.cos(theta)*rad*10;

            let ast = new THREE.Mesh(geo, mat);
            ast.position.x = x;
            ast.position.y = y;
            ast.position.z = z; 
            window.GameHandler.Scene.add(ast);
        }
        */
        //add object to scene. 
        //window.GameHandler.Scene.add(this._mainObject);
    }

    Main(dt){
        super.Main(dt);
        this.#AsteroidRotation(); 
        this.#AutoMovement();
    }

    #AsteroidRotation = () => {
        this._mainObject.rotation.y += this.#rotDir;//this.#randFloat;
         
    }

    #AutoMovement = () => {
        //increment positional changes
        this._mainObject.position.add(this.#random);
    }

    #ParameterSetup = () => {
        //object rotation
        this.#rotDir = THREE.MathUtils.randFloat(-0.005, 0.005);;

        //object movement
        let x = THREE.MathUtils.randFloat(-0.01, 0.01),
            y = THREE.MathUtils.randFloat(-0.01, 0.01),
            z = THREE.MathUtils.randFloat(-0.01, 0.01);
        this.#random = new THREE.Vector3(x, y, z);

    }

}



export default AsteroidObject;