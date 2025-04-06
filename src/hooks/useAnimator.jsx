import { useEffect, useRef, useState } from 'react';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { AnimationMixer } from 'three';
import { Clock } from 'three';

export function useAnimator(name, path, scene, onLoaded) {
	const [animations, setAnimations] = useState([]);
	const [modelName, setModelName] = useState(name);
	const [model, setModel] = useState(null);
	const [mixer, setMixer] = useState(null);

	const loader = useRef(new GLTFLoader()).current;
	const clock = useRef(new Clock()).current;

	const isLoadedRef = useRef(false); // only allow for one load

	useEffect(() => {
		if (!scene || isLoadedRef.current) return;
		isLoadedRef.current = true;

		loader.load(
			path,
			// onLoad, called after loaded model
			(gltf) => {
				const loadedModel = gltf.scene;
				loadedModel.name = modelName;
				console.log('GLTF SCENE: ' + loadedModel);

				// Add the loaded model to the scene
				// THREE.Group - virtually the same as Object3D
				scene.add(loadedModel);

				setModel(loadedModel);
				setMixer(new AnimationMixer(loadedModel));

				// Set model animations nested in GLTF/GLB file
				// Array<THREE.AnimationClip>
				setAnimations(gltf.animations);

				// GLTF Object
				console.log('OBJECT CREATED: ' + gltf.asset);

				if (onLoaded) onLoaded(loadedModel, gltf.animations);
			},
			(xhr) => {
				console.log('Model ' + modelName + ': ' + (xhr.loaded / xhr.total) * 100 + '% loaded');
			},
			(error) => {
				console.error(`Failed to load model '${modelName}' @ ${path}: `, error);
			}
		);

		return () => {
			if (model) {
				scene.remove(model);
			}
		};
	}, []);

	// Handle model animation
	const playAnimation = (name) => {
		if (!mixer || animations.length === 0) return;

		const clip = animations.find((a) => a.name === name);
		if (!clip) {
			console.warn(`Animation "${name}" not found`);
			return;
		}

		mixer.stopAllAction();
		mixer.clipAction(clip).reset().fadeIn(0.3).play();
	};

	const updateMixer = (delta) => {
		if (mixer) {
			mixer.update(delta);
		}
	};

	// Handle the clock and timing for the animation
	const animationLoop = () => {
		let frameId;
		const animate = () => {
			const delta = clock.getDelta();
			updateMixer(delta);
			frameId = requestAnimationFrame(animate);
		};
		animate();
		return () => cancelAnimationFrame(frameId);
	};

	// Animation loop use effect
	useEffect(() => {
		const cleanUp = animationLoop();
		return cleanUp;
	}, [updateMixer]);

	return {
		model: model,
		animations: animations,
		playAnimation,
	};
}
