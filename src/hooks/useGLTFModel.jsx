import { useEffect, useRef, useState } from 'react';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { AnimationMixer } from 'three';

export function useGLTFModel(path, scene, onLoaded) {
	const [animations, setAnimations] = useState([]);
	const modelRef = useRef(null);
	const mixerRef = useRef(null);
	const loaderRef = useRef(new GLTFLoader());

	useEffect(() => {
		if (!scene) return;

		loaderRef.current.load(
			path,
			(gltf) => {
				if (modelRef.current) {
					scene.remove(modelRef.current);
				}

				const loadedModel = gltf.scene;
				loadedModel.name = 'HorseGLB';
				scene.add(loadedModel);
				modelRef.current = loadedModel;

				const mixer = new AnimationMixer(loadedModel);
				mixerRef.current = mixer;
				setAnimations(gltf.animations);

				// 🔍 Print unique materials
				const materials = new Set();
				loadedModel.traverse((child) => {
					if (child.isMesh && child.material) {
						if (Array.isArray(child.material)) {
							child.material.forEach((mat) => materials.add(mat));
						} else {
							materials.add(child.material);
						}
					}
				});

				console.log('[HorseGLB] Materials used:');
				[...materials].forEach((mat, i) => {
					console.log(`  ${i + 1}. name: "${mat.name}", type: ${mat.type}`);
				});

				if (onLoaded) onLoaded(loadedModel, gltf.animations, mixer);
			},
			undefined,
			(error) => {
				console.error(`Failed to load model: ${path}`, error);
			}
		);

		return () => {
			if (modelRef.current) {
				scene.remove(modelRef.current);
			}
		};
	}, [path, scene]);

	const playAnimation = (name) => {
		const mixer = mixerRef.current;
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
		if (mixerRef.current) {
			mixerRef.current.update(delta);
		}
	};

	return {
		model: modelRef.current,
		animations,
		playAnimation,
		updateMixer,
		mixer: mixerRef.current,
	};
}
