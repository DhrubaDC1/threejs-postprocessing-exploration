import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { GUI } from "dat.gui";
import { BokehPass } from "three/examples/jsm/Addons.js";
import { AmbientLight } from "three";
import Stats from "three/examples/jsm/libs/stats.module.js";

const renderer = new THREE.WebGLRenderer({ antialias: true });

renderer.setSize(window.innerWidth, window.innerHeight);

document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
	45,
	window.innerWidth / window.innerHeight,
	0.1,
	1000
);

const controls = new OrbitControls(camera, renderer.domElement);
console.log("🚀 ~ controls:", controls);
controls.enableDamping = true;
// controls.dampingFactor = 0.001;
// controls.enablePan = true;
// controls.enableRotate = true;

camera.position.set(0, 0, 9);
camera.lookAt(scene.position);
const stats = new Stats();
document.body.appendChild(stats.dom);
const params = {
	threshold: 0,
	strength: 1,
	radius: 0.5,
	exposure: 1.5,
	Eye_left: true,
	Eye_right: true,
	Head: false,
	// Object_13: true,
	// Object_14: true,
};

const renderScene = new RenderPass(scene, camera);
const bloomComposer = new EffectComposer(renderer);
bloomComposer.addPass(renderScene);

const bloomPass = new UnrealBloomPass(
	new THREE.Vector2(window.innerWidth, window.innerHeight),
	1.6,
	0.1,
	0.1
);
bloomComposer.addPass(bloomPass);

// bloomPass.strength = 0.4;
// bloomPass.radius = 1.2;
// bloomPass.threshold = 0.1;
bloomPass.threshold = params.threshold;
bloomPass.strength = params.strength;
bloomPass.radius = params.radius;

// const outputPass = new OutputPass();
// bloomComposer.addPass(outputPass);

bloomComposer.renderToScreen = false;

const mixPass = new ShaderPass(
	new THREE.ShaderMaterial({
		uniforms: {
			baseTexture: { value: null },
			bloomTexture: { value: bloomComposer.renderTarget2.texture },
		},
		vertexShader: document.getElementById("vertexshader").textContent,
		fragmentShader: document.getElementById("fragmentshader").textContent,
	}),
	"baseTexture"
);

const finalComposer = new EffectComposer(renderer);
finalComposer.addPass(renderScene);

finalComposer.addPass(mixPass);

const outputPass = new OutputPass();
finalComposer.addPass(outputPass);

const BLOOM_SCENE = 1;

const bloomLayer = new THREE.Layers();
bloomLayer.set(BLOOM_SCENE);

const darkMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
const materials = {};

function nonBloomed(obj) {
	if (obj.isMesh && bloomLayer.test(obj.layers) === false) {
		materials[obj.uuid] = obj.material;
		obj.material = darkMaterial;
	}
}

function restoreMaterial(obj) {
	if (materials[obj.uuid]) {
		obj.material = materials[obj.uuid];
		delete materials[obj.uuid];
	}
}

renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = params.exposure;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const gui = new GUI();
const bloomFolder = gui.addFolder("Bloom");

bloomFolder.add(params, "threshold", 0.0, 5.0).onChange(function (value) {
	bloomPass.threshold = Number(value);
});

bloomFolder.add(params, "strength", 0.0, 5).onChange(function (value) {
	bloomPass.strength = Number(value);
});

bloomFolder
	.add(params, "radius", 0.0, 5.0)
	.step(0.01)
	.onChange(function (value) {
		bloomPass.radius = Number(value);
	});

const toneMappingFolder = gui.addFolder("Tone mapping");
toneMappingFolder.add(params, "exposure", 0.1, 2).onChange(function (value) {
	renderer.toneMappingExposure = Math.pow(value, 4.0);
});
const light = new AmbientLight();
scene.add(light);
const loader = new GLTFLoader();

/// Dof code

// Add some geometry to the scene
const geometry = new THREE.SphereGeometry(0.5, 32, 32);
const material = new THREE.MeshStandardMaterial({ color: 0xff0000 });
const sphere = new THREE.Mesh(geometry, material);
scene.add(sphere);

// Add more objects
const objects = [sphere];
for (let i = 0; i < 10; i++) {
	const cubeGeometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
	const cubeMaterial = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
	const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
	cube.position.set(
		Math.random() * 4 - 2,
		Math.random() * 2 - 1,
		Math.random() * -5 - 1
	);
	scene.add(cube);
	objects.push(cube); // Store objects for focus selection
}

// const pointLight = new THREE.PointLight(0xffffff, 1);
// pointLight.position.set(5, 5, 5);
// scene.add(pointLight);

// Set up post-processing
// const composer = new EffectComposer(renderer);
// const renderPass = new RenderPass(scene, camera);
// composer.addPass(renderPass);

// Bokeh (DOF) effect parameters
const bokehParams = {
	focus: 1.0, // The distance at which objects are in perfect focus
	aperture: 0.025, // Aperture - smaller values mean more blur
	maxblur: 1.0, // Maximum blur strength
};

// Add BokehPass
const bokehPass = new BokehPass(scene, camera, bokehParams);
finalComposer.addPass(bokehPass);

function focusOnObject(object) {
	const vector = new THREE.Vector3();
	object.getWorldPosition(vector);
	const distance = camera.position.distanceTo(vector);
	bokehPass.materialBokeh.uniforms.focus.value = distance;
}

// Event listener to focus on the first object (the red sphere) for demonstration
document.addEventListener("keydown", (event) => {
	if (event.key === "f") {
		// Press 'f' to focus on the red sphere
		focusOnObject(sphere);
	}
});

const bokehFolder = gui.addFolder("Depth of Field");
bokehFolder
	.add(bokehParams, "focus", 0, 10)
	.onChange((value) => (bokehPass.materialBokeh.uniforms.focus.value = value));
bokehFolder
	.add(bokehParams, "aperture", 0.0001, 0.1)
	.onChange(
		(value) => (bokehPass.materialBokeh.uniforms.aperture.value = value)
	);
bokehFolder
	.add(bokehParams, "maxblur", 0, 3)
	.onChange(
		(value) => (bokehPass.materialBokeh.uniforms.maxblur.value = value)
	);
bokehFolder.open();

let mixer;
loader.load("models/gltf/kid.glb", function (glb) {
	const model = glb.scene;
	console.log("model", model);
	model.scale.set(0.025, 0.025, 0.025);

	scene.add(model);
	model.position.set(-1, -1, 0);

	const partsFolder = gui.addFolder("Parts");
	partsFolder.closed = false;

	const darkMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
	const bloomColorMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 }); // Red bloom color

	// Adjust your bloom logic for specific parts
	partsFolder.add(params, "Eye_left").onChange(function () {
		const eyeLeft = model.getObjectByName("EYE_LEFT");
		eyeLeft.layers.toggle(BLOOM_SCENE);
		eyeLeft.material = bloomColorMaterial; // Apply red bloom color to the left eye
	});
	partsFolder.add(params, "Eye_right").onChange(function () {
		const eyeRight = model.getObjectByName("EYE_RIGHT");
		eyeRight.layers.toggle(BLOOM_SCENE);
		eyeRight.material = bloomColorMaterial; // Apply red bloom color to the right eye
	});
	partsFolder.add(params, "Head").onChange(function () {
		const head = model.getObjectByName("GirlBlendshapes");
		head.layers.toggle(BLOOM_SCENE);
		head.material = bloomColorMaterial; // Apply red bloom color to the head
	});

	// partsFolder.add(params, "Object_14").onChange(function () {
	// 	model.getObjectByName("Object_14").layers.toggle(BLOOM_SCENE);
	// });

	// Set the initial values from the GUI
	model.getObjectByName("EYE_LEFT").layers.toggle(BLOOM_SCENE);
	model.getObjectByName("EYE_RIGHT").layers.toggle(BLOOM_SCENE);
	// model.getObjectByName("Object_14").layers.toggle(BLOOM_SCENE);
});

renderer.setAnimationLoop(animate);
// const clock = new THREE.Clock();
function animate() {
	// controls.update();
	// if (mixer) mixer.update(clock.getDelta());
	stats.update();
	scene.traverse(nonBloomed);

	bloomComposer.render();

	scene.traverse(restoreMaterial);
	// composer.render();
	finalComposer.render();
	// requestAnimationFrame(animate);
}

window.addEventListener("resize", function () {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize(window.innerWidth, window.innerHeight);
	bloomComposer.setSize(window.innerWidth, window.innerHeight);
	finalComposer.setSize(window.innerWidth, window.innerHeight);
});
