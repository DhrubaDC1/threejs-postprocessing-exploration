import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/Addons.js';

let camera, renderer, scene, controls;

init();

async function init() {
    console.log('Initializing scene...');

    // Scene setup
    scene = new THREE.Scene();

    // Camera setup
    camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 1, 100);
    camera.position.set(-5, 2.5, -3.5);
    scene.add(camera);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xcccccc,10);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xffffff, 10);
    camera.add(pointLight);

    // Renderer setup
    renderer = new THREE.WebGLRenderer();
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setAnimationLoop(animate);
    document.body.appendChild(renderer.domElement);

	// add orbit controls
	controls = new OrbitControls(camera, renderer.domElement);
	controls.enableDamping = true;
	controls.dampingFactor = 0.1;

    // Load the GLTF model
    const loader = new GLTFLoader();
    loader.load('models/gltf/kid.glb', (gltf) => {
        const model = gltf.scene;
		model.scale.set(0.025, 0.025, 0.025);
        scene.add(model);
    }, undefined, (error) => {
        console.error('An error occurred while loading the model:', error);
    });

    window.addEventListener('resize', onWindowResize, false);
}

// Function to handle window resize
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Animation loop
function animate() {
    renderer.render(scene, camera);
}
