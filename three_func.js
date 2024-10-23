import * as THREE from 'three';

import Stats from 'three/addons/libs/stats.module.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

let camera, stats;
let composer, renderer, mixer, clock;

const params = {
	threshold: 0,
	strength: 0.25,
	radius: 0,
	exposure: 0.5
};
let finalComposer;

init();

async function init() {
	console.log('insideee')


	const container = document.getElementById('container');

	clock = new THREE.Clock();

	const scene = new THREE.Scene();

	camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 1, 100);
	camera.position.set(- 5, 2.5, - 3.5);
	scene.add(camera);

	scene.add(new THREE.AmbientLight(0xcccccc));

	const pointLight = new THREE.PointLight(0xffffff, 100);
	camera.add(pointLight);

	const loader = new GLTFLoader();
	const gltf = await loader.loadAsync('models/gltf/kid.glb');


	const model = gltf.scene;
	model.scale.set(0.025, 0.025, 0.025);
	scene.add(model);

	// mixer = new THREE.AnimationMixer(model);
	// const clip = gltf.animations[0];
	// mixer.clipAction(clip.optimize()).play();

	//

	renderer = new THREE.WebGLRenderer({ antialias: true });
	renderer.setPixelRatio(window.devicePixelRatio);
	renderer.setSize(window.innerWidth, window.innerHeight);
	renderer.setAnimationLoop(animate);
	container.appendChild(renderer.domElement);
	renderer.toneMapping = THREE.SRGBColorSpace;

	//

	const renderScene = new RenderPass(scene, camera);

	const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
	bloomPass.threshold = params.threshold;
	bloomPass.strength = params.strength;
	bloomPass.radius = params.radius;

	const outputPass = new OutputPass();
	
	composer = new EffectComposer(renderer);
	composer.addPass(renderScene);
	composer.addPass(bloomPass);

	composer.renderToScreen = false;

	const mixPass = new ShaderPass(
		new THREE.ShaderMaterial( {
			uniforms: {
				baseTexture: { value: null },
				bloomTexture: { value: composer.renderTarget2.texture }
			},
			vertexShader: document.getElementById( 'vertexshader' ).textContent,
			fragmentShader: document.getElementById( 'fragmentshader' ).textContent,
			defines: {}
		} ), 'baseTexture'
	);
	mixPass.needsSwap = true;

	finalComposer = new EffectComposer( renderer );
	finalComposer.addPass( renderScene );
	finalComposer.addPass( mixPass );
	finalComposer.addPass( outputPass );

	composer.addPass(outputPass);
	
	//

	stats = new Stats();
	container.appendChild(stats.dom);

	//

	const controls = new OrbitControls(camera, renderer.domElement);
	controls.maxPolarAngle = Math.PI * 0.5;
	controls.minDistance = 3;
	controls.maxDistance = 8;

	//

	const gui = new GUI();

	const bloomFolder = gui.addFolder('bloom');

	bloomFolder.add(params, 'threshold', 0.0, 1.0).onChange(function (value) {

		bloomPass.threshold = Number(value);

	});

	bloomFolder.add(params, 'strength', 0.0, 1).onChange(function (value) {

		bloomPass.strength = Number(value);

	});

	gui.add(params, 'radius', 0.0, 1.0).step(0.01).onChange(function (value) {

		bloomPass.radius = Number(value);

	});

	const toneMappingFolder = gui.addFolder('tone mapping');

	toneMappingFolder.add(params, 'exposure', 0.1, 2).onChange(function (value) {

		renderer.toneMappingExposure = Math.pow(value, 4.0);

	});

	window.addEventListener('resize', onWindowResize);

}

function onWindowResize() {

	const width = window.innerWidth;
	const height = window.innerHeight;

	camera.aspect = width / height;
	camera.updateProjectionMatrix();

	renderer.setSize(width, height);
	composer.setSize(width, height);

}

function animate() {

	const delta = clock.getDelta();

	// mixer.update(delta);

	stats.update();

	composer.render();

	renderer.setSize(window.innerWidth, window.innerHeight)
	composer.setSize(window.innerWidth, window.innerHeight)
	finalComposer.setSize(window.innerWidth, window.innerHeight)

}