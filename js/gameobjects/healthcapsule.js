import * as THREE from '../../libraries/three.module.js'
import GameObject from '../gameobject.js';

class HealthCapsule extends GameObject {
    #gltfObject;
    #mixer;
    #pointLight = new THREE.PointLight(0x00ff66, 5, 50);
    #lightIntensityDelta = 0.2;
    #maxPointLightIntensity = 10;

    #maxScale = 5;

    #isSpawning = false;
    #minDistanceToPlayer = 300;

    #circleSprite;
    #circleSpriteTargetOpacity = 0;
    #circleSpriteVisibleDist = 100;

    IsHealthCapsule = true;

    constructor() {
        super(window.GameHandler.AssetHandler.LoadedAssets.health_capsule.scene);

        this.#gltfObject = window.GameHandler.AssetHandler.LoadedAssets.health_capsule;

        this.#setupCapsuleObject();

        this.#setupMixer();
    }

    #setupCapsuleObject = () => {
        this._mainObject.traverse(child => {
            if (child.isMesh) {
                var redMaterial = new THREE.MeshPhongMaterial({ color: 0xcc3333 });
                var greenMaterial = new THREE.MeshPhongMaterial({ color: 0x00ff66 });
                var goldMaterial = new THREE.MeshPhongMaterial({ color: 0xffff99 });
    
                switch (true) {
                    case /lid/.test(child.name):
                        child.material = redMaterial;
                        break;
                    case /innercylinder/.test(child.name):
                        child.material = greenMaterial;
                        child.layers.enable(window.GameHandler.RenderLayers.BLOOM_STATIC_HIGH);
                        break;
                    case /ring|cross/.test(child.name):
                        child.material = goldMaterial;
                        child.layers.enable(window.GameHandler.RenderLayers.BLOOM_STATIC);
                }
            }
        });
        window.GameHandler.Scene.add(this.#pointLight);
        this.Object.add(this.#pointLight);

        let circleTexture = window.GameHandler.AssetHandler.LoadedImages.sprites.healthCapsuleCircle;
        let material = new THREE.SpriteMaterial({ map: circleTexture, sizeAttenuation: false, transparent: true, opacity: 0 });

        this.#circleSprite = new THREE.Sprite(material);
        this.#circleSprite.layers.enable(window.GameHandler.RenderLayers.BLOOM_STATIC);
        this.#circleSprite.scale.set(0.05, 0.05, 0.05);
        this.Object.add(this.#circleSprite);

        window.GameHandler.Scene.add(this.Object);
        this.Object.visible = false;
    }

    #setupMixer = () => {
        this.#mixer = new THREE.AnimationMixer(this.#gltfObject.scene);
        this.#gltfObject.animations.forEach(clip => {
            this.#mixer.clipAction(clip).play();
        });
    }

    Main(dt) {
        super.Main(dt);

        // expand into view when spawning
        if (this.#isSpawning) {
            let newScale = THREE.MathUtils.lerp(this._mainObject.scale.x, this.#maxScale, 5 * dt);
            this._mainObject.scale.setScalar(newScale);

            if (newScale >= this.#maxScale * 0.98) {
                this.#isSpawning = false;
            }
        }
        else {
            // float towards the player if they're close enough
            let distToPlayer = window.GameHandler.Player.Position.distanceTo(this.Object.position);
            if (distToPlayer <= window.GameHandler.Player.CurrentShieldRadius) {
                window.GameHandler.Player.ConsumeHealthCapsule(80);
                this.Despawn();
            }
            else if (distToPlayer <= this.#minDistanceToPlayer) {
                let dir = window.GameHandler.Player.Position.sub(this.Object.position).normalize();

                // as the capsule gets closer to the player it speeds up (to a maximum speed)
                let scale = Math.min(1000 / distToPlayer, 100);
                let amountToTranslate = dir.multiplyScalar(scale * dt);

                this.Object.position.add(amountToTranslate);
            }

            this.#circleSpriteTargetOpacity = distToPlayer <= this.#circleSpriteVisibleDist ? 0 : 1;
            this.#circleSprite.material.opacity = THREE.Math.lerp(this.#circleSprite.material.opacity, this.#circleSpriteTargetOpacity, dt);
        }

        // update animations
        this.#mixer.update(dt);
        
        // bounce light intensity between dim and bright - not workign nicely right now (looks bad)
        // this.#pointLight.intensity += this.#lightIntensityDelta * dt;
        // if (this.#pointLight.intensity >= this.#maxPointLightIntensity) {
        //     this.#lightIntensityDelta = -2.5;
        // }
        // else if (this.#pointLight.intensity <= 0) {
        //     this.#pointLight.intensity = 0;
        //     this.#lightIntensityDelta = 2.5;
        // }
        // this.#pointLight.intensity = 0;

        
    }

    Spawn(position) {
        this.Object.visible = true;
        this._mainObject.scale.setScalar(0);
        this.#isSpawning = true;
        this.Object.position.copy(position);
        window.GameHandler.AddGameObject(this);

        // initialise the light as off but turning on
        // this.#pointLight.intensity = 0;
        // this.#lightIntensityDelta = 2.5;

        // this.#pointLight.intensity = 5;
    }

    Despawn() {
        this.Object.visible = false;
        this.#isSpawning = false; // in case it gets picked up while spawning
        window.GameHandler.RemoveGameObject(this);

        //later would be good to run a cool animation here
    }

    get IsSpawned() {
        return this.Object.visible;
    }
}


// OLD CODE - For Rohan to compare and see if he agrees with my revisions
class HealthCapsule_Rohan extends GameObject {
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
