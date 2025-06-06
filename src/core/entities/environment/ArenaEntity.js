// core/entities/environment/ArenaEntity.js
import * as THREE from 'three';
import { ModelLoader } from '../../../utils/ModelLoader';

export class ArenaEntity {
	constructor(scene, position) {
		this.scene = scene;
		this.position = position || { x: 0, y: 0, z: 0 };

		this.modelPath = '/models/environment/JoustArena.glb';
		this.model = null;

		this.arenaLoaded = false;
		this.groundLoaded = false;

		// Load model
		this.modelLoader = new ModelLoader('Joust Arena', this.modelPath);
		this.modelLoader.load((loadedModel) => {
			this.model = loadedModel;
			this.setupArena();
		});
	}

	setupArena() {
		if (this.arenaLoaded || !this.model) return;

		// Explicitly set position
		this.model.position.set(0, 0, 19);
		this.model.rotation.y = Math.PI / 2;

		// Add to scene
		this.scene.add(this.model);
		this.arenaLoaded = true;

		console.log('Arena model set up at position:', this.model.position);
	}

	update(deltaTime) {
		// No updates needed for static arena
	}

	dispose() {
		// Clean up arena model
		if (this.model) {
			this.scene.remove(this.model);

			// Dispose of geometries and materials
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

		// Clean up ground
		if (this.groundMesh) {
			this.scene.remove(this.groundMesh);
			this.groundMesh.geometry.dispose();
			this.groundMesh.material.dispose();
		}
	}
}
