import * as THREE from '../../libraries/three.module.js';
import * as UTILS from '../utils.js';

import GameObject from '../gameobject.js';

class ObstacleObject extends GameObject {

  //characteristics
  /*
  #height = 1;
  #width = 1;
  */

  //no parameter as object is being created here.
  constructor(){
    super(obst);

    //create basic object to test
    var geo = new THREE.BoxGeometry(11, 11, 11);
    var mat = new THREE.MeshBasicMaterial( { color:	0xff0000 });
    var obst = new THREE.Mesh( geo, mat);
    //add object to scene
    window.GameHandler.Scene.add(obst);
  }

  Main(dt){
    super.Main();
  }
}

export default ObstacleObject;
