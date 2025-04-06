import * as THREE from 'three';
import { EffectComposer, RenderPass, ShaderPass } from 'three/examples/jsm/Addons.js';
import { PixelArtShader } from '../shaders/PixelArtShader.jsx';

/**
 * Initializes lighting, post-processing, and rendering
 * @param {THREE.Scene} scene
 * @param {THREE.Camera} cameraRef.current
 * @returns {{ dispose: () => void }}
 */
export const initGraphics = (scene, cameraRef) => {
	const ambient = new THREE.AmbientLight(0xffffff, 0.6);
	scene.add(ambient);

	const dirLight = new THREE.DirectionalLight(0xffffff, 1);
	dirLight.position.set(5, 10, 7.5);
	scene.add(dirLight);

	const renderer = new THREE.WebGLRenderer({ antialias: false });
	renderer.setPixelRatio(1);
	renderer.setSize(window.innerWidth, window.innerHeight);
	document.body.appendChild(renderer.domElement);

	// Add cameraRef.current to the scene to ensure it has a parent
	if (cameraRef.current && scene && cameraRef.current instanceof THREE.Camera) {
		if (!cameraRef.current.parent) {
			scene.add(cameraRef.current);
		}
	}

	const composer = new EffectComposer(renderer);
	const renderPass = new RenderPass(scene, cameraRef.current);
	const pixelPass = new ShaderPass(PixelArtShader);
	pixelPass.uniforms['resolution'].value.set(window.innerWidth, window.innerHeight);
	pixelPass.uniforms['pixelSize'].value = 4;

	composer.addPass(renderPass);
	composer.addPass(pixelPass);

	const handleResize = () => {
		if ('left' in cameraRef.current) {
			// OrthographicCamera
			const zoom = 150;
			cameraRef.current.left = -window.innerWidth / zoom;
			cameraRef.current.right = window.innerWidth / zoom;
			cameraRef.current.top = window.innerHeight / zoom;
			cameraRef.current.bottom = -window.innerHeight / zoom;
			cameraRef.current.updateProjectionMatrix();
		} else {
			// PerspectiveCamera
			cameraRef.current.aspect = window.innerWidth / window.innerHeight;
			cameraRef.current.updateProjectionMatrix();
		}

		renderer.setSize(window.innerWidth, window.innerHeight);
		composer.setSize(window.innerWidth, window.innerHeight);
		pixelPass.uniforms['resolution'].value.set(window.innerWidth, window.innerHeight);
	};

	window.addEventListener('resize', handleResize);

	const animate = () => {
		renderPass.camera = cameraRef.current;
		composer.render();
		requestAnimationFrame(animate);
	};
	animate();

	return {
		dispose: () => {
			window.removeEventListener('resize', handleResize);
			renderer.dispose();
			document.body.removeChild(renderer.domElement);
		},
	};
};
