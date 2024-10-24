import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { GUI } from "dat.gui";
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
controls.enableDamping = true;

camera.position.set(0, -2, 15);
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

let mixer;
loader.load("models/gltf/kid.glb", function (glb) {
	const model = glb.scene;
	console.log("model", model);
	model.scale.set(0.025, 0.025, 0.025);

	scene.add(model);
	model.position.set(0, -2.4, 11);

	// const animations = glb.animations;
	// mixer = new THREE.AnimationMixer(model);
	// const clip = animations[0];
	// const action = mixer.clipAction(clip);
	// action.play();

	const partsFolder = gui.addFolder("Parts");
	partsFolder.closed = false;

	partsFolder.add(params, "Eye_left").onChange(function () {
		model.getObjectByName("EYE_LEFT").layers.toggle(BLOOM_SCENE);
	});
	partsFolder.add(params, "Eye_right").onChange(function () {
		model.getObjectByName("EYE_RIGHT").layers.toggle(BLOOM_SCENE);
	});
	partsFolder.add(params, "Head").onChange(function () {
		model.getObjectByName("GirlBlendshapes").layers.toggle(BLOOM_SCENE);
	});
	// partsFolder.add(params, "Object_14").onChange(function () {
	// 	model.getObjectByName("Object_14").layers.toggle(BLOOM_SCENE);
	// });

	// Set the initial values from the GUI
	model.getObjectByName("EYE_LEFT").layers.toggle(BLOOM_SCENE);
	model.getObjectByName("EYE_RIGHT").layers.toggle(BLOOM_SCENE);
	// model.getObjectByName("Object_14").layers.toggle(BLOOM_SCENE);
});
// console.log("🚀 ~ model:", model);

// const rayCaster = new THREE.Raycaster();
// const mouse = new THREE.Vector2();
// function onPointerDown(event) {
//   mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
//   mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

//   rayCaster.setFromCamera(mouse, camera);
//   const intersects = rayCaster.intersectObjects(scene.children);
//   if (intersects.length > 0) {
//     const object = intersects[0].object;
//     object.layers.toggle(BLOOM_SCENE);
//   }
// }
// window.addEventListener('pointerdown', onPointerDown);

const clock = new THREE.Clock();
function animate() {
	// controls.update();
	// if (mixer) mixer.update(clock.getDelta());
	stats.update();
	scene.traverse(nonBloomed);

	bloomComposer.render();

	scene.traverse(restoreMaterial);

	finalComposer.render();
	renderer.setAnimationLoop(animate);
	// requestAnimationFrame(animate);
}
animate();

window.addEventListener("resize", function () {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize(window.innerWidth, window.innerHeight);
	bloomComposer.setSize(window.innerWidth, window.innerHeight);
	finalComposer.setSize(window.innerWidth, window.innerHeight);
});
