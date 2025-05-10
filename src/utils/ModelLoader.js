// utils/ModelLoader.js
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import * as THREE from 'three';

export class ModelLoader {
	constructor(name, path) {
		this.name = name;
		this.path = path;
		this.model = null;
		this.loadedTexture = null;

		this.loader = new GLTFLoader();
		this.textureLoader = new THREE.TextureLoader();
		this.callbacks = [];
		this.isLoaded = false;
	}

	load(onLoaded = null) {
		if (this.isLoaded) {
			if (onLoaded) onLoaded(this.model);
			return;
		}

		if (onLoaded) {
			this.callbacks.push(onLoaded);
		}

		this.loader.load(
			this.path,
			(gltf) => {
				this.model = gltf.scene;
				this.model.name = this.name;
				this.isLoaded = true;

				console.log('Model loaded:', this.model);

				// Call all registered callbacks
				this.callbacks.forEach((callback) => callback(this.model));
				this.callbacks = [];
			},
			(xhr) => {
				console.log(
					'Loading model ' + this.name + ': ' + (xhr.loaded / xhr.total) * 100 + '% loaded'
				);
			},
			(error) => {
				console.error(`Failed to load model '${this.name}' @ ${this.path}: `, error);
			}
		);
	}

	setMaterial(path, textureName) {
		const texture = this.textureLoader.load(path);
		texture.name = textureName;
		texture.colorSpace = THREE.SRGBColorSpace;
		texture.wrapS = THREE.RepeatWrapping;
		texture.wrapT = THREE.RepeatWrapping;
		texture.flipY = false;
		texture.userData = { mimeType: 'image/png' };
		this.loadedTexture = texture;

		if (this.model) {
			this.model.traverse((child) => {
				if (child instanceof THREE.Mesh) {
					child.material.map = texture;
					console.log('Material applied to:', child.name);
				}
			});
		}

		return texture;
	}
}
