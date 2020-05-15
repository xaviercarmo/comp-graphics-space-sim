import * as THREE from '../../libraries/three.module.js';
import * as UTILS from '../utils.js';

import GameObject from '../gameobject.js';
import GameHandler from '../gamehandler.js';

class ObstacleObject extends GameObject { 

  //no parameter as object is being created here.
  obstacle;
  obstaclePosition;
  

  constructor(){
    super(obst); 
    //create basic object
    //randomise size
    let rad = THREE.MathUtils.randInt(5, 20);
    let det = THREE.MathUtils.randInt(1, 3);
  
    var geo = new THREE.IcosahedronGeometry(rad, det);
    var mat = new THREE.MeshBasicMaterial( { color:	0xff0000 });
    var obst = new THREE.Mesh(geo, mat);
    this.obstacle = obst; 

    //random spawn
    //Random int per axis  (range of +/- 100)
    let x = THREE.MathUtils.randFloat(-100, 100);
    let y = THREE.MathUtils.randFloat(-100, 100);
    let z = THREE.MathUtils.randFloat(-100, 100);
    let ranPos = new THREE.Vector3(x, y, z);

    
    ranPos.clampLength(0, 100);
    console.log("Position", ranPos);
    //Setting spawn range around player position.
    //add the position onto existing player position?
    //var newPos = window.GameHandler.Player.Object.position.clone().add(ranPos); //vector3
    this.obstaclePosition = this.ranPos;
    //Set new position and add object to scene
    this.obstacle.position.add(ranPos);
    window.GameHandler.Scene.add(this.obstacle);
  }
  

  Main(dt){
    super.Main();
  }

  ChangePos(x, y, z) {
    this.obstacle.position.set(x, y, z);
  }

}

export default ObstacleObject;
