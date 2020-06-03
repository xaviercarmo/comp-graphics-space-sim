import * as THREE from '../../../libraries/three.module.js';
import * as INPUT from '../../input.js';
import * as UTILS from '../../utils.js';

import PhysicsObject from '../physics.js';

class AsteroidObject extends PhysicsObject {
    //icosaherdon geo
    //procedurally generate via perlin noise
    //randomise shape/size of object.

    //temp - not sure if needed yet. 
    #asteroid;  

    constructor() {
        let rad = 5;
        let det = 1;
        let numObjects = 10;

        let geo = new THREE.IcosahedronGeometry(rad, det);
        //lambertian better for matte surfaces, ideal for stone not shiny surfaces
        let mat = new THREE.MeshLambertMaterial( { color: 0xDEB887 });
        //mat.wireframe = true; 
        let obj = new THREE.Mesh(geo, mat);
        super(obj);
        this.#asteroid = obj; 
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
        this.AsteroidRotation(); 
    }

    AsteroidRotation(){
        this._mainObject.rotation.y += 0.0025;
    }

}

export default AsteroidObject;