import { useEffect, useRef, useState } from 'react';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import * as THREE from 'three';

export function useModel(name, path, onLoaded) {
	const modelRef = useRef(null);
	const [model, setModel] = useState(null);
	const [loadedTexture, setLoadedTexture] = useState(null);
	const loader = useRef(new GLTFLoader()).current;
	const textureLoader = useRef(new THREE.TextureLoader()).current;
	const isLoadedRef = useRef(false);

	useEffect(() => {
		if (isLoadedRef.current) return;
		isLoadedRef.current = true;

		loader.load(
			path,
			(gltf) => {
				const loadedModel = gltf.scene;
				loadedModel.name = name;
				console.log('Model loaded:', loadedModel);

				setModel(loadedModel);
				modelRef.current = loadedModel;

				if (onLoaded) onLoaded(loadedModel);
			},
			(xhr) => {
				console.log('Loading model ' + name + ': ' + (xhr.loaded / xhr.total) * 100 + '% loaded');
			},
			(error) => {
				console.error(`Failed to load model '${name}' @ ${path}: `, error);
			}
		);
	}, []);

	const setMaterial = (path, textureName) => {
		const texture = textureLoader.load(path);
		texture.name = textureName;
		texture.colorSpace = THREE.SRGBColorSpace;
		texture.wrapS = THREE.RepeatWrapping;
		texture.wrapT = THREE.RepeatWrapping;
		texture.flipY = false;
		texture.userData = { mimeType: 'image/png' };
		setLoadedTexture(texture);

		modelRef.current?.traverse((child) => {
			if (child instanceof THREE.Mesh) {
				child.material.map = texture;
				console.log('Material applied to:', child.name);
			}
		});
	};

	return {
		model: modelRef.current,
		setMaterial,
		material: loadedTexture,
	};
}
