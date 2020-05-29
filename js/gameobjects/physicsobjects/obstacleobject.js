import * as THREE from '../../../libraries/three.module.js';
import * as UTILS from '../../utils.js';

import GameObject from '../../gameobject.js';
import GameHandler from '../../gamehandler.js';

class ObstacleObject extends GameObject { 
  
  constructor(){
    /*
    let rad = THREE.MathUtils.randInt(5, 20);
    let det = THREE.MathUtils.randInt(1, 3);
  
    var geo = new THREE.IcosahedronGeometry(rad, det);
    var mat = new THREE.MeshBasicMaterial( { color:	0xff0000 });
    var obst = new THREE.Mesh(geo, mat);
    */
    //var spriteMap = new THREE.TextureLoader().load('../../assets/sprites/asteroid_1.png');
    var spriteMap = window.GameHandler.AssetHandler.LoadedImages.sprites.asteroidTexture;
    var spriteMaterial = new THREE.SpriteMaterial({map: spriteMap});
    var obst = new THREE.Sprite(spriteMaterial);
    
    super(obst); 
    //randomise size
    //random spawn
    //Random range via random int per axis.
    let x = THREE.MathUtils.randFloat(-50, 50);
    let y = THREE.MathUtils.randFloat(-50, 50);
    let z = THREE.MathUtils.randFloat(-50, 50);
    let ranPos = new THREE.Vector3(x, y, z);
    //ranPos.clampLength(-100, 100); //creates spherical range

    //Setting spawn range around player position.
    //add the position onto existing player position?
    let newPos = window.GameHandler.Player.Object.position.clone().add(ranPos); //vector3
    
    //Set new position and add object to scene
    //scale object size, as its very small initially
    this._mainObject.scale.set(1, 1, 1);
    //why does copy but not set or add work when trying to console.log 
    this._mainObject.position.copy(newPos); 
    console.log(this._mainObject.position);
    //console.log("position of obst",this._mainObject.position, );
    window.GameHandler.Scene.add(this._mainObject);
  }
  

  Main(dt){
    super.Main();
  }
  /*
  ChangePos(vector3) {
    this._mainObject.position.copy(vector3);
  }
  */

}

export default ObstacleObject;
