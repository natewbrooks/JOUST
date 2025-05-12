// utils/AnimationLoader.js
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { AnimationMixer } from 'three';
import { Clock } from 'three';
import * as THREE from 'three';
import { getAssetPath } from './AssetPath';

export class AnimationLoader {
	constructor(name, path, scene) {
		this.name = name;
		this.path = getAssetPath(path);
		this.scene = scene;

		this.model = null;
		this.animations = [];
		this.mixer = null;
		this.loadedTexture = null;

		this.loader = new GLTFLoader();
		this.textureLoader = new THREE.TextureLoader();
		this.clock = new Clock();

		this.isLoaded = false;
		this.callbacks = [];
		this.deltaAccumulator = 0;
	}

	load(onLoaded = null) {
		if (this.isLoaded) {
			if (onLoaded) onLoaded(this.model, this.animations);
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
				this.animations = gltf.animations;

				// Add to scene
				this.scene.add(this.model);

				// Create animation mixer
				this.mixer = new THREE.AnimationMixer(this.model);

				console.log(`Model ${this.name} loaded with ${this.animations.length} animations`);

				this.isLoaded = true;

				// Call all registered callbacks
				this.callbacks.forEach((callback) => callback(this.model, this.animations));
				this.callbacks = [];
			},
			(xhr) => {
				console.log('Model ' + this.name + ': ' + (xhr.loaded / xhr.total) * 100 + '% loaded');
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
					console.log('Material changed to: ' + texture.name);
				}
			});
		}

		return texture;
	}

	update(deltaTime) {
		if (this.mixer) {
			this.mixer.update(deltaTime);
		}
	}

	playAnimation(name) {
		if (!this.mixer || this.animations.length === 0) return;

		const clip = this.animations.find((a) => a.name === name);
		if (!clip) {
			console.warn(`Animation "${name}" not found`);
			return;
		}

		this.mixer.stopAllAction();
		this.mixer.clipAction(clip).reset().fadeIn(0.3).play();
	}

	dispose() {
		if (this.model) {
			// Remove from scene
			this.scene.remove(this.model);

			// Dispose geometries and materials
			this.model.traverse((child) => {
				if (child.geometry) {
					child.geometry.dispose();
				}

				if (child.material) {
					if (Array.isArray(child.material)) {
						child.material.forEach((material) => material.dispose());
					} else {
						child.material.dispose();
					}
				}
			});
		}

		// Clean up animation mixer
		if (this.mixer) {
			this.mixer.stopAllAction();
			// The mixer doesn't have a dispose method
		}
	}
}
