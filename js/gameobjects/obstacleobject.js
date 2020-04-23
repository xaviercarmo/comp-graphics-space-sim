import * as THREE from '../../libraries/three.module.js';
import * as UTILS from '../utils.js';

import GameObject from '../gameobject.js';

class ObstacleObject extends GameObject {

  //characteristics
  //no parameter as object is being created here.
  constructor(){
    super(obst);

    //create basic object
    //randomise size
    var w, h , d;
    w = THREE.MathUtils.randInt(5, 20);
    h = THREE.MathUtils.randInt(5, 20);
    d = THREE.MathUtils.randInt(5, 20);
    var geo = new THREE.BoxGeometry( w, h , d);
    var mat = new THREE.MeshBasicMaterial( { color:	0xff0000 });
    var obst = new THREE.Mesh(geo, mat);

    //random spawn
    var x, y, z;
    //x=y=z=Math.random();

    //Random int per axis
    x = THREE.MathUtils.randInt(0, 100);
    y = THREE.MathUtils.randInt(0, 100);
    z = THREE.MathUtils.randInt(0, 100);
    console.log( x, y , z);
    obst.position.set( x, y, z);

    //add object to scene
    window.GameHandler.Scene.add(obst);
  }

  Main(dt){
    super.Main();
  }

}

export default ObstacleObject;
