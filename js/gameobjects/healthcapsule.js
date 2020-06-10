import * as THREE from '../../libraries/three.module.js'
import GameObject from '../gameobject.js';

class HealthCapsule extends GameObject {
    #gltfObject;
    #mixer;

    constructor(position = new THREE.Vector3()) {
        super(window.GameHandler.AssetHandler.LoadedAssets.health_capsule.scene);

        this.#gltfObject = window.GameHandler.AssetHandler.LoadedAssets.health_capsule;

        this._mainObject.traverse(child => {
          // apply materials here based on child.name (e.g. if child.name starts with Torus, add shiny phong material)
          var lidmaterial = new THREE.MeshPhongMaterial({ color: 0xCC3333 });
          var innercylindermat = new THREE.MeshPhongMaterial({ color: 0x00FF66});
          var ringmat = new THREE.MeshPhongMaterial({ color: 0xFFFF99});


            if(child.name == 'lidtop' || child.name == 'lidbot') {
                child.material = lidmaterial;

            };
            if(child.name == 'innercylinder') {
                child.material = innercylindermat;
                child.layers.enable(window.GameHandler.RenderLayers.BLOOM_STATIC_HIGH);
            };
            if(child.name == 'ring1' || child.name == 'ring2' || child.name == 'ring3') {
              child.material = ringmat;
              child.layers.enable(window.GameHandler.RenderLayers.BLOOM_STATIC);
            };
            if(child.name == 'crosstop1' || child.name == 'crosstop2' || child.name == 'crossbot1' || child.name == 'crossbot2') {
              child.material = ringmat;
              child.layers.enable(window.GameHandler.RenderLayers.BLOOM_STATIC);

          };
        })

        //scale down the capsule
        this._mainObject.scale.set(5, 5, 5); //_mainObject == this.#gltfObject.scene, because of the parent's constructor

        //move the group to the position specified by the parameter. note that _mainObject is a child of _objectGroup
        this._objectGroup.position.copy(position);

        this.#mixer = new THREE.AnimationMixer(this.#gltfObject.scene);
        this.#gltfObject.animations.forEach(clip => {
            this.#mixer.clipAction(clip).play();
        });
    }

    Main(dt) {
        super.Main(dt);

        this.#mixer.update(dt);
    }
}

export default HealthCapsule;
