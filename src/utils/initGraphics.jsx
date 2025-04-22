import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { PixelArtShader } from '../shaders/PixelArtShader.jsx';

export const initGraphics = (scene, topCameraRef, bottomCameraRef) => {
	const ambient = new THREE.AmbientLight(0xffffff, 0.6);
	scene.add(ambient);

	const dirLight = new THREE.DirectionalLight(0xffffff, 1);
	dirLight.position.set(5, 10, 7.5);
	scene.add(dirLight);

	const renderer = new THREE.WebGLRenderer({ antialias: false });
	renderer.setPixelRatio(1);
	renderer.setSize(window.innerWidth, window.innerHeight);
	renderer.setScissorTest(true);
	document.body.appendChild(renderer.domElement);

	// === Create EffectComposers per camera ===
	const topComposer = new EffectComposer(renderer);
	const bottomComposer = new EffectComposer(renderer);

	const topRenderPass = new RenderPass(scene, topCameraRef.current);
	const bottomRenderPass = new RenderPass(scene, bottomCameraRef.current);

	const topPixelPass = new ShaderPass(PixelArtShader);
	const bottomPixelPass = new ShaderPass(PixelArtShader);

	topComposer.addPass(topRenderPass);
	topComposer.addPass(topPixelPass);

	bottomComposer.addPass(bottomRenderPass);
	bottomComposer.addPass(bottomPixelPass);

	const handleResize = () => {
		const w = window.innerWidth;
		const h = window.innerHeight;
		const gap = 4;

		const topHeight = h * 0.7 - gap / 2;
		const bottomHeight = h * 0.3 - gap / 2;

		renderer.setSize(w, h);

		// Update top camera aspect
		if (topCameraRef.current && topCameraRef.current.isPerspectiveCamera) {
			topCameraRef.current.aspect = w / topHeight;
			topCameraRef.current.updateProjectionMatrix();
		}

		// Update bottom camera frustum
		if (bottomCameraRef.current && bottomCameraRef.current.isOrthographicCamera) {
			// Use stored zoom factor instead of hardcoded value
			const zoom = bottomCameraRef.current.userData.zoomFactor || 150;
			bottomCameraRef.current.left = -w / zoom;
			bottomCameraRef.current.right = w / zoom;
			bottomCameraRef.current.top = bottomHeight / zoom;
			bottomCameraRef.current.bottom = -bottomHeight / zoom;
			bottomCameraRef.current.updateProjectionMatrix();
		}

		// Rest of the handleResize function remains the same
		topComposer.setSize(w, topHeight);
		topPixelPass.uniforms['resolution'].value.set(w, topHeight);
		topPixelPass.uniforms['pixelSize'].value = 3.0;

		bottomComposer.setSize(w, bottomHeight);
		bottomPixelPass.uniforms['resolution'].value.set(w, bottomHeight);
		bottomPixelPass.uniforms['pixelSize'].value = 3.0;

		// Append overlay divs for top and bottom viewports
		const topDiv = document.createElement('div');
		topDiv.id = 'topViewport';
		topDiv.style.position = 'absolute';
		topDiv.style.top = '0';
		topDiv.style.left = '0';
		topDiv.style.width = '100%';
		topDiv.style.height = '70%';
		// topDiv.style.pointerEvents = 'none';
		topDiv.style.zIndex = '10';
		document.body.appendChild(topDiv);

		const bottomDiv = document.createElement('div');
		bottomDiv.id = 'bottomViewport';
		bottomDiv.style.position = 'absolute';
		bottomDiv.style.bottom = '0';
		bottomDiv.style.left = '0';
		bottomDiv.style.width = '100%';
		bottomDiv.style.height = '30%';
		// bottomDiv.style.pointerEvents = 'none';
		bottomDiv.style.zIndex = '10';
		document.body.appendChild(bottomDiv);
	};

	window.addEventListener('resize', handleResize);
	handleResize(); // Call once on init

	const animate = () => {
		const w = window.innerWidth;
		const h = window.innerHeight;
		const gap = 4;

		const topHeight = h * 0.7 - gap / 2;
		const bottomHeight = h * 0.3 - gap / 2;

		// === Top Viewport (Perspective)
		renderer.setViewport(0, bottomHeight + gap, w, topHeight);
		renderer.setScissor(0, bottomHeight + gap, w, topHeight);
		topComposer.render();

		// === Bottom Viewport (Ortho)
		renderer.setViewport(0, 0, w, bottomHeight);
		renderer.setScissor(0, 0, w, bottomHeight);
		bottomComposer.render();

		requestAnimationFrame(animate);
	};
	animate();

	return {
		dispose: () => {
			window.removeEventListener('resize', handleResize);
			renderer.dispose();
			document.body.removeChild(renderer.domElement);
			document.body.removeChild(document.getElementById('topViewport'));
			document.body.removeChild(document.getElementById('bottomViewport'));
		},
		renderer,
	};
};
