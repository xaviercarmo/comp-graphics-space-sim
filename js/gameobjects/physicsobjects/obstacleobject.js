import * as THREE from '../../../libraries/three.module.js';
import * as UTILS from '../../utils.js';

import GameObject from '../../gameobject.js';
import GameHandler from '../../gamehandler.js';

class ObstacleObject extends GameObject { 
 //public variable to enable changes to position.
  //obstaclePosition;
  
  constructor(){
    /*
    let rad = THREE.MathUtils.randInt(5, 20);
    let det = THREE.MathUtils.randInt(1, 3);
  
    var geo = new THREE.IcosahedronGeometry(rad, det);
    var mat = new THREE.MeshBasicMaterial( { color:	0xff0000 });
    var obst = new THREE.Mesh(geo, mat);
    */
    var spriteMap = new THREE.TextureLoader().load('../../assets/sprites/asteroid.png');
    //var spriteMap = new THREE.TextureLoader().load('https://threejs.org/examples/textures/sprite1.png');
    var spriteMaterial = new THREE.SpriteMaterial({map: spriteMap});
    var obst = new THREE.Sprite(spriteMaterial);
    
    super(obst); 
    //create basic object
    //randomise size
    //random spawn
    //Random int per axis  (range of +/- 100)
    let x = THREE.MathUtils.randFloat(0, 400);
    let y = THREE.MathUtils.randFloat(0, 400);
    let z = THREE.MathUtils.randFloat(0, 400);
    let ranPos = new THREE.Vector3(x, y, z);
    //ranPos.clampLength(0, 400); //creates spherical range

    //Setting spawn range around player position.
    //add the position onto existing player position?
    let newPos = window.GameHandler.Player.Object.position.clone().add(ranPos); //vector3
    
    //set spawn in front of player 
    //Get direction of camera and add it to player pos
    let pPos = window.GameHandler.Player.Object.position.clone();
    let vect = new THREE.Vector3(); 
    let cDir = window.GameHandler.Camera.getWorldDirection(vect); 

    //vector to store position
    let frontPos = new THREE.Vector3;
    frontPos.set(pPos.x + cDir.x*x , pPos.y + cDir.y*y, pPos.z + cDir.z*z);
    console.log("player", pPos);
    console.log(frontPos);
      
    //Set new position and add object to scene
    //scale object size, as its very small initially
    this._mainObject.scale.set(10,10, 1);
    //why does copy but not set or add work when trying to console.log 
    this._mainObject.position.copy(frontPos); 
    //console.log("position of obst",this._mainObject.position, );
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
