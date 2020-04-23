import * as THREE from '../libraries/three.module.js';
import * as INPUT from './input.js';
import * as UTILS from './utils.js';

import AssetHandler from './assethandler.js';
import GameObject from './gameobject.js';
import PlayerObject from './gameobjects/playerobject.js';
import ParticleSystem from './particlesystem.js';

class GameHandler {
    //debug
    get Camera() { return this.#camera; }

    //privates
    #camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 100_000);
    #renderer = new THREE.WebGLRenderer({ antialias: true });
    #clock = new THREE.Clock();


    //later, this meshes loading logic will be moved to the AssetHandler
    #meshes = {
        player: {
            ship: {},
            gattling_gun: {},
            rail_gun: {},
            plasma_gun: {}
        }
    };
    #gameObjects = [];

    #modes = {
        NONE: 0,
        PRELOADING: 1,
        INITIALISING: 2,
        MAINMENU: 3,
        GAMERUNNING: 4,
        GAMEPAUSED: 5,
        GAMEOVER: 6
    }
    #mode = this.#modes.NONE;

    #player;

    #scene = new THREE.Scene();

    //publics
    AssetHandler = new AssetHandler();

    constructor() {
        let gameHandler = this;
        this.#mode = this.#modes.PRELOADING;

        this.AssetHandler.LoadAllAssets(() => {
            $(".loading-text").text("Initialising game...");

            //Allows dom to re-render with initialising text
            setTimeout(() => {
                gameHandler.Initialise();
            }, 0);
        });
    }

    //private methods
    //NOTE: Due to current lack of support in Chrome for private instance methods we will use private fields that hold methods
    #animate = () => {
        //regardless of pausing, animation frames should continue for menu logic
        requestAnimationFrame(() => { this.#animate(); });

        INPUT.UpdateKeyPressedOnce();

        //delta still needed for menu logic and so that physics doesn't jump ahead by a large delta after unpausing
        let dt = this.#clock.getDelta();

        if (INPUT.KeyPressedOnce("p")) {
            this.TogglePause();
        }
        
        if (INPUT.KeyPressedOnce("t")) {
            this.SkyBox.visible = !this.SkyBox.visible;
            console.log(this.SkyBox.visible);
        }

        //menu logic here
        //[...]

        let playerOldPosition = this.#player.Object.position.clone();

        //game logic only runs if game isn't paused
        if (this.#mode == this.#modes.GAMERUNNING) {
            this.#gameObjects.forEach(g => g.Main(dt));
    
            this.#gameObjects.forEach(g => {
                //physics logic here (later moved to physics handler probably)
                //[...]
    
                g.PostPhysicsCallback(dt);
            });
        }

        //game logic that runs despite pausing
        this.#gameObjects.forEach(g => g.MainNoPause(dt));

        let playerPositionDelta = UTILS.SubVectors(this.#player.Object.position, playerOldPosition);
        this.SkyBox.position.addScaledVector(playerPositionDelta, 0.9);

        // let titties = this.pointsGeometry.attributes.position.array;
        // for (let i = 0; i < this.numParticles; i += 3) {
        //     //titties[i + 2] += 2 * dt;
        // }
        //this.pointsGeometry.attributes.position.needsUpdate = true;
        //this.pointsGeometry.computeBoundingSphere();

        //must be done AFTER all other main logic has run
        INPUT.FlushKeyPressedOnce();

        this.#renderer.render(this.#scene, this.#camera);
    }

    #setupMenuEvents = () => {
        $(".hangar-sub-menu-heading").hover(
            function() {
                //on hover
                $(this).parent().addClass("hangar-sub-menu-container-hover");
            },
            function() {
                //on un-hover
                $(this).parent().removeClass("hangar-sub-menu-container-hover");
            }
        );

        $(".hangar-sub-menu-heading").click(function() {
            let contract = (jqObj) => {
                jqObj.parent().removeClass("hangar-sub-menu-container-expanded");
                jqObj.removeClass("hangar-sub-menu-heading-selected");
            }
            if ($(this).parent().is(".hangar-sub-menu-container-expanded")) {
                //if already expanded, then contract
                contract($(this));
            }
            else {
                //if not expanded, then expand and contract all other sub menu containers
                $(".hangar-sub-menu-heading-selected").each(function() {
                    contract($(this));
                });

                $(this).parent().addClass("hangar-sub-menu-container-expanded");
                $(this).addClass("hangar-sub-menu-heading-selected");
            }
        });
    }

    #initialiseSkyMap = () => {
        let skyMapTextures = this.AssetHandler.LoadedImages.skymap;
        let matParams = { side: THREE.BackSide, depthWrite: false };
        let materials = [
            new THREE.MeshBasicMaterial({ map: skyMapTextures.rt, ...matParams }),
            new THREE.MeshBasicMaterial({ map: skyMapTextures.lt, ...matParams }),
            new THREE.MeshBasicMaterial({ map: skyMapTextures.tp, ...matParams }),
            new THREE.MeshBasicMaterial({ map: skyMapTextures.bm, ...matParams }),
            new THREE.MeshBasicMaterial({ map: skyMapTextures.ft, ...matParams }),
            new THREE.MeshBasicMaterial({ map: skyMapTextures.bk, ...matParams }),
        ];

        let skyBoxGeo = new THREE.BoxGeometry(100_000, 100_000, 100_000);
        let skyBox = new THREE.Mesh(skyBoxGeo, materials);
        this.Scene.add(skyBox);
        skyBox.visible = true;

        this.SkyBox = skyBox;
    }

    //public methods
    Initialise() {
        this.#mode = this.#modes.INITIALISING;

        //later can extend this to animate the cursor
        $("body").css({ "cursor": "url(assets/cursors/scifi.png), auto" });

        let assets = [
            {
                path: this.AssetHandler.AssetPaths3D[0],
                onComplete: obj => this.#meshes.player.ship = obj
            },
            {
                path: this.AssetHandler.AssetPaths3D[1],
                onComplete: obj => this.#meshes.player.gattling_gun = obj
            },
            {
                path: this.AssetHandler.AssetPaths3D[2],
                onComplete: obj => this.#meshes.player.rail_gun = obj
            }
        ];

        UTILS.LoadAssets(assets, () => {
            this.InitialiseScene();
            this.StartGameRunning();
            window.setTimeout(() => $(".pre-downloader").remove(), 1000);
        });
    }

    InitialiseScene() {
        window.addEventListener("resize", () => { this.Resize(); });

        document.body.appendChild(this.#renderer.domElement);

        this.AddPlayer();

        //this.#player.SetupPointerLock();

        this.#gameObjects.forEach(g => { this.#scene.add(g.Object); });

        let light = new THREE.HemisphereLight( 0xffffbb, 0x080820, 10 );
        this.#scene.add(light);

        let gridHelper = new THREE.GridHelper(5000, 100);
        this.#scene.add(gridHelper);

        this.#initialiseSkyMap();

        this.#renderer.setPixelRatio(window.devicePixelRatio);
        this.#renderer.setSize(window.innerWidth, window.innerHeight);
        this.#renderer.shadowMap.enabled = true;
        //this.#renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        this.#setupMenuEvents();

        this.particleSystem = new ParticleSystem(this.AssetHandler.LoadedImages.sprites.thrusterSprite, 5, 5);

        //this.TheirSpecialStuff();
        //this.MySuperSpecialStuff();

        // let verts = [];
        // for (let i = 0; i < 10000; i++) {
        //     var x = THREE.MathUtils.randFloatSpread(50);
        //     var y = THREE.MathUtils.randFloatSpread(50);
        //     var z = THREE.MathUtils.randFloatSpread(50);

        //     verts.push(x, y, z);
        // }

        // var geometry = new THREE.BufferGeometry();
        // geometry.setAttribute( 'position', new THREE.Float32BufferAttribute( verts, 3 ) );

        // var material = new THREE.PointsMaterial( { color: 0x888888 } );

        // var points = new THREE.Points( geometry, material );

        // this.Scene.add( points );

        this.#renderer.render(this.#scene, this.#camera);
    }

    MySpecialStuff() {
        let particles = 2000;
        let geometry = new THREE.BufferGeometry();
        let arrayBuffer = new ArrayBuffer(particles * 16); //12 bytes for position, 4 for colour
        let positionBufferView = new Float32Array(arrayBuffer);
        let colourBufferView = new Uint8Array(arrayBuffer); //later try doing a float array? shaders use 0-1 so bit weird to pass 255

        let colour = new THREE.Color();
        let xRange = 7, halfX = xRange / 2;
        let yRange = 5, halfY = yRange / 2;
        let zRange = 10, halfZ = zRange / 2;

        let uniforms = {
            color: { value: new THREE.Color( 0xffff00 ) },
        };

        let baseShaderMaterial = new THREE.ShaderMaterial({
            uniforms: { color: { value: new THREE.Color(0x000000) } },
            vertexShader:   document.getElementById('vertexshader').textContent,
            fragmentShader: document.getElementById('fragmentshader').textContent,
            transparent:    true
        });

        for (let i = 0; i < positionBufferView.length; i += 4) {
            let x = Math.random() * xRange - halfX;
            let y = Math.random() * yRange - halfY;
            let z = Math.random() * zRange - halfZ;

            positionBufferView[i] = x;
            positionBufferView[i + 1] = y;
            positionBufferView[i + 2] = z;

            let shaderMaterial = baseShaderMaterial.clone();
            let r = 255;
            let g = 50;
            let b = 0;
            shaderMaterial.uniforms.color.value.setRGB();
        }
    }

    //Don't think passing the alpha in is going to work here. Seems like it just doesn't work...
    TheirSpecialStuff() {
        var particles = 500000;
        var geometry = new THREE.BufferGeometry();
        var arrayBuffer = new ArrayBuffer( particles * 20 );
        var interleavedFloat32Buffer = new Float32Array( arrayBuffer );
        var interleavedUint8Buffer = new Uint8Array( arrayBuffer );
        var color = new THREE.Color();
        var n = 1000, n2 = n / 2; // particles spread in the cube

        for ( var i = 0; i < interleavedFloat32Buffer.length; i += 5 ) { //i += 4 bc 3 taken up by the 3 floats, 1 taken up by the 3 colours + holder

            // position (first 12 bytes) (each float32 is 4 bytes, 4 * 3 = 12)

            var x = Math.random() * n - n2;
            var y = Math.random() * n - n2;
            var z = Math.random() * n - n2;

            interleavedFloat32Buffer[ i + 0 ] = x;
            interleavedFloat32Buffer[ i + 1 ] = y;
            interleavedFloat32Buffer[ i + 2 ] = z;

            // alpha (next 4 bytes)
            
            interleavedFloat32Buffer[ i + 3 ] = 0;

            // color (last 4 bytes) (each uInt8 is a byte, 4 * 1 = 4)

            var vx = ( x / n ) + 0.5;
            var vy = ( y / n ) + 0.5;
            var vz = ( z / n ) + 0.5;

            color.setRGB( vx, vy, vz );

            var j = ( i + 3 ) * 4;

            interleavedUint8Buffer[ j + 0 ] = color.r * 255;
            interleavedUint8Buffer[ j + 1 ] = color.g * 255;
            interleavedUint8Buffer[ j + 2 ] = color.b * 255;
            interleavedUint8Buffer[ j + 3 ] = 0; // not needed

        }

        var interleavedBuffer32 = new THREE.InterleavedBuffer( interleavedFloat32Buffer, 5 );
        var interleavedBuffer8 = new THREE.InterleavedBuffer( interleavedUint8Buffer, 20 );

        geometry.setAttribute( 'position', new THREE.InterleavedBufferAttribute( interleavedBuffer32, 3, 0, false ) );
        geometry.setAttribute( 'alpha', new THREE.InterleavedBufferAttribute( interleavedBuffer32, 1, 3, true ) );
        geometry.setAttribute( 'color', new THREE.InterleavedBufferAttribute( interleavedBuffer8, 3, 12, true ) );

        //

        var material = new THREE.PointsMaterial( { size: 15, vertexColors: true, transparent: true } ); //vertex colours makes the color attribute get used i think

        let points = new THREE.Points( geometry, material );
        this.Scene.add( points );
    }

    MySuperSpecialStuff() {
        let numVertices = 3000;
        let arraySize = numVertices * 3;
        let geometry = new THREE.BufferGeometry();
        let alphas = new Float32Array(arraySize * 1);
        let positions = new Float32Array(arraySize * 1);
        let colours = new Uint8Array(arraySize * 1);

        let xyVec = new THREE.Vector2();

        let minXRange = 1;
        let minYRange = 0.5;
        let xRange = 2.5, halfXRange = xRange / 2;
        let yRange = 1.5, halfYRange = yRange / 2;
        let zRange = 10;
        let alpha = 0.5;
        for (let i = 0; i < arraySize; i += 3) {
            alphas[i] = alpha;
            alphas[i + 1] = alpha;
            alphas[i + 2] = alpha;

            let x = Math.random() * xRange - halfXRange;
            let y = Math.random() * yRange - halfYRange;
            let z = Math.random() * zRange;

            let zPct = z / zRange;

            positions[i] = (x) * Math.min(Math.sqrt(zPct + 0.8), 1.4);
            positions[i + 1] = (y) * Math.min(zPct + 0.2, 0.6);
            positions[i + 2] = z;

            let r = zPct * 255;
            let g = (1 - zPct) * (1 - zPct) * 200;
            let b = (1 - zPct) * 255;
            colours[i] = r;
            colours[i + 1] = g;
            colours[i + 2] = b;
        }

        geometry.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1));
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colours, 3, true));

        let uniforms = {
            texture: { value: this.AssetHandler.LoadedImages.sprites.thrusterSprite }
        };
        let shaderMaterial = new THREE.ShaderMaterial({
            uniforms: uniforms,
            vertexShader: document.getElementById( 'transparencyVertexShader' ).textContent,
            fragmentShader: document.getElementById( 'transparencyFragmentShader' ).textContent,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthTest: false
        });

        let points = new THREE.Points(geometry, shaderMaterial);
        this.pointsGeometry = geometry;
        this.numParticles = arraySize;
        this.Scene.add(points);
    }

    AddPlayer() {
        let playerMeshes = {
            ship: this.#meshes.player.ship.clone(),
            gattling_gun: this.#meshes.player.gattling_gun.clone(),
            rail_gun: this.#meshes.player.rail_gun.clone()
        };

        this.#player = new PlayerObject(playerMeshes, this.#camera);
        this.AddGameObject(this.#player);
    }

    AddGameObject(object) {
        if (object instanceof GameObject) {
            this.#gameObjects.push(object);
        }
        else {
            console.log(`GameHandler rejected object: ${object} as it was not a GameObject`, object);
        }
    }

    StartGameRunning() {
        this.#mode = this.#modes.GAMERUNNING;
        this.#animate();
    }

    //resizes the renderer to fit the screen
    Resize() {
        this.#renderer.setSize(window.innerWidth, window.innerHeight);
        this.#camera.aspect = window.innerWidth / window.innerHeight;
        this.#camera.updateProjectionMatrix();
    }

    //toggles mode between running and paused. Will do nothing if mode is not currently one of the two.
    TogglePause() {
        if (this.#mode == this.#modes.GAMERUNNING) {
            this.#mode = this.#modes.GAMEPAUSED;
            
            //release mouse
            document.exitPointerLock();

            //show hangar menu
            $(".hangar-menu-base-container").addClass("hangar-menu-base-container-expanded");
        }
        else if (this.#mode == this.#modes.GAMEPAUSED) {
            this.#mode = this.#modes.GAMERUNNING;
            
            //reclaim mouse
            this.#renderer.domElement.requestPointerLock();

            //hide hangar menu
            $(".hangar-menu-base-container").removeClass("hangar-menu-base-container-expanded");
        }
        else {
            console.log("Cannot toggle pause, game is not currently running or paused.");
        }
    }

    get Scene() { return this.#scene; }

    get Player() { return this.#player; }

    get Renderer() { return this.#renderer; }

    get IsPaused() { return this.#mode == this.#modes.GAMEPAUSED; }
}

export default GameHandler;
