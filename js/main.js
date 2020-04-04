class GameHandler {
    #scene = new THREE.Scene();
    #camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    #renderer = new THREE.WebGLRenderer({ antialias: true });
    #clock = new THREE.Clock();

    constructor() {
        this.#renderer.setSize(window.innerWidth, window.innerHeight);
        document.body.appendChild(this.#renderer.domElement);
        //const self = this;
        window.addEventListener("resize", () => { this.Resize(); });

        //temporary for testing
        var geometry = new THREE.BoxGeometry(1, 1, 1);
        var directionalLight = new THREE.DirectionalLight(0xffffff);
        directionalLight.position.set(0, 20, 10);
        var ambientLight = new THREE.AmbientLight(0x707070);
		var material = new THREE.MeshPhongMaterial({ color: 0x00aaff });
		this.cube = new THREE.Mesh(geometry, material);

        this.#scene.add(this.cube);
        this.#scene.add(directionalLight);
        this.#scene.add(ambientLight);

        this.#camera.position.z = 3;

        this.Animate();
    }

    //public to allow requestAnimationFrame to call it
    Animate() {
        requestAnimationFrame(() => { this.Animate(); });
        var delta = this.#clock.getDelta();
        this.cube.rotation.x += 1 * delta;
        this.cube.rotation.y += 1 * delta;

        this.#renderer.render(this.#scene, this.#camera);
    }

    Resize() {
        console.log("resizing");
        this.#renderer.setSize(window.innerWidth, window.innerHeight);
        this.#camera.aspect = window.innerWidth / window.innerHeight;
        this.#camera.updateProjectionMatrix();
    }
}

// //might use this class later
// class PerspectiveCamera {
//     constructor(fov = 45, aspectRatio = window.innerWidth / window.innerHeight) {
//         this.#camera = new THREE.PerspectiveCamera(this.fov, this.aspectRatio, 0.1, 1000);
//     }
//
//     set Fov(newFov) {
//         this.#camera.fov = newFov;
//         this.#camera.updateProjectionMatrix;
//     }
// }
//
//
// class Test {
//     #testPrivateVar = 5;
//     constructor(){
//         this.publicVar = 10;
//     }
//
//     GetPrivateVar(){
//         return this.#testPrivateVar;
//     }
// }
