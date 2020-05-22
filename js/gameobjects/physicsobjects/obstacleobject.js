import * as THREE from '../../../libraries/three.module.js';
import * as UTILS from '../../utils.js';

import GameObject from '../../gameobject.js';

class ObstacleObject extends GameObject { 
 //public variable to enable changes to position.
  //obstaclePosition;
  
  constructor(){
    let rad = THREE.MathUtils.randInt(5, 20);
    let det = THREE.MathUtils.randInt(1, 3);
  
    var geo = new THREE.IcosahedronGeometry(rad, det);
    var mat = new THREE.MeshBasicMaterial( { color:	0xff0000 });
    var obst = new THREE.Mesh(geo, mat);
    super(obst); 
    //create basic object
    //randomise size
    //random spawn
    //Random int per axis  (range of +/- 100)
    let x = THREE.MathUtils.randFloat(-400, 400);
    let y = THREE.MathUtils.randFloat(-400, 400);
    let z = THREE.MathUtils.randFloat(-400, 400);
    let ranPos = new THREE.Vector3(x, y, z);
    ranPos.clampLength(0, 400); 
    console.log("Position", ranPos);

    //Setting spawn range around player position.
    //add the position onto existing player position?
    var newPos = window.GameHandler.Player.Object.position.clone().add(ranPos); //vector3
    
    //Set new position and add object to scene
    this._mainObject.position.add(newPos);
    window.GameHandler.Scene.add(this._mainObject);
  }
  

  Main(dt){
    super.Main();
  }

  ChangePos(x, y, z) {
    this._mainObject.position.set(x, y, z);
  }

}

export default ObstacleObject;
