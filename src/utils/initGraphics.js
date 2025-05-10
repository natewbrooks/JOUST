// utils/initGraphics.js
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { PixelArtShader } from '../shaders/PixelArtShader';
import GameState from '../game-state';

export const initGraphics = (scene, topCameraRef, bottomCameraRef) => {
	scene.background = new THREE.Color('#87ceeb');

	// Increase ambient light intensity for overall brightness
	const ambient = new THREE.AmbientLight(0xffffff, 1);
	scene.add(ambient);

	// Main directional light from above
	const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
	dirLight.position.set(50, 50, 50); // Position the light above and to the side
	dirLight.castShadow = true;
	scene.add(dirLight);

	// Secondary directional light from opposite direction for fill lighting
	const dirLight2 = new THREE.DirectionalLight(0xffffff, 0.8);
	dirLight2.position.set(-50, 30, -50);
	scene.add(dirLight2);

	// Point light at the center for additional brightness
	const pointLight = new THREE.PointLight(0xffffff, 1.0, 100);
	pointLight.position.set(0, 10, 0);
	scene.add(pointLight);

	// Hemisphere light for sky/ground lighting
	const hemisphereLight = new THREE.HemisphereLight(0xffffaa, 0x444433, 0.5);
	hemisphereLight.position.set(0, 20, 0);
	scene.add(hemisphereLight);

	// Create renderer
	const renderer = new THREE.WebGLRenderer({ antialias: false });
	renderer.setPixelRatio(1);
	renderer.setSize(window.innerWidth, window.innerHeight);
	renderer.setScissorTest(true);
	renderer.toneMapping = THREE.ACESFilmicToneMapping; // Better tone mapping for brightness
	renderer.toneMappingExposure = 1.2; // Increase exposure for brighter scene

	// Create canvas but don't append to document yet - we'll let React handle this
	const canvas = renderer.domElement;

	// === Create EffectComposers per camera ===
	const topComposer = new EffectComposer(renderer);
	const bottomComposer = new EffectComposer(renderer);

	const topRenderPass = new RenderPass(scene, topCameraRef);
	const bottomRenderPass = new RenderPass(scene, bottomCameraRef);

	const topPixelPass = new ShaderPass(PixelArtShader);
	const bottomPixelPass = new ShaderPass(PixelArtShader);

	topComposer.addPass(topRenderPass);
	topComposer.addPass(topPixelPass);

	bottomComposer.addPass(bottomRenderPass);
	bottomComposer.addPass(bottomPixelPass);

	if (GameState.debug) {
		// Add debug grid to help with orientation - make it brighter too
		const gridHelper = new THREE.GridHelper(100, 100, 0x666666, 0xbbbbbb);
		scene.add(gridHelper);

		// Add debug axes - make them more visible
		const axesHelper = new THREE.AxesHelper(15);
		scene.add(axesHelper);
	}

	const handleResize = () => {
		const w = window.innerWidth;
		const h = window.innerHeight;
		const gap = 4;

		const topHeight = h * 0.7 - gap / 2;
		const bottomHeight = h * 0.3 - gap / 2;

		renderer.setSize(w, h);

		// Update top camera aspect
		if (topCameraRef && topCameraRef.isPerspectiveCamera) {
			topCameraRef.aspect = w / topHeight;
			topCameraRef.updateProjectionMatrix();
		}

		// Update bottom camera frustum
		if (bottomCameraRef && bottomCameraRef.isOrthographicCamera) {
			// Use stored zoom factor instead of hardcoded value
			const zoom = bottomCameraRef.userData.zoomFactor || 150;
			bottomCameraRef.left = -w / zoom;
			bottomCameraRef.right = w / zoom;
			bottomCameraRef.top = bottomHeight / zoom;
			bottomCameraRef.bottom = -bottomHeight / zoom;
			bottomCameraRef.updateProjectionMatrix();
		}

		// Update composers
		topComposer.setSize(w, topHeight);
		topPixelPass.uniforms['resolution'].value.set(w, topHeight);
		topPixelPass.uniforms['pixelSize'].value = GameState.use_shaders ? 3.0 : 1.0;

		bottomComposer.setSize(w, bottomHeight);
		bottomPixelPass.uniforms['resolution'].value.set(w, bottomHeight);
		bottomPixelPass.uniforms['pixelSize'].value = GameState.use_shaders ? 3.0 : 1.0;
	};

	window.addEventListener('resize', handleResize);
	handleResize(); // Call once on init

	// Animation function - called by Game's animation loop
	const render = () => {
		const w = window.innerWidth;
		const h = window.innerHeight;
		const gap = 4;

		const topHeight = h * 0.7 - gap / 2;
		const bottomHeight = h * 0.3 - gap / 2;

		// Check if we should use the debug camera
		// The cameraManager is passed as the topCameraRef in the Game.js call
		const cameraManager = topCameraRef;
		const useDebugCamera = cameraManager && cameraManager.isDebugCameraActive;
		const activeTopCamera =
			useDebugCamera && cameraManager.debugCamera
				? cameraManager.debugCamera
				: cameraManager.playerPovCamera;

		// Update render pass camera
		topRenderPass.camera = activeTopCamera;

		// === Top Viewport (Perspective)
		renderer.setViewport(0, bottomHeight + gap, w, topHeight);
		renderer.setScissor(0, bottomHeight + gap, w, topHeight);
		topComposer.render();

		// === Bottom Viewport (Ortho)
		renderer.setViewport(0, 0, w, bottomHeight);
		renderer.setScissor(0, 0, w, bottomHeight);
		bottomComposer.render();
	};

	return {
		canvas,
		render,
		dispose: () => {
			window.removeEventListener('resize', handleResize);
			renderer.dispose();
		},
	};
};
