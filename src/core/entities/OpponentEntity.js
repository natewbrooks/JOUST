// core/entities/OpponentEntity.js
import * as THREE from 'three';
import { AnimationLoader } from '../../utils/AnimationLoader';
import { HorseEntity } from './HorseEntity';
import GameState from '../../game-state';

export class OpponentEntity {
	constructor(scene, position, team, flipped) {
		this.scene = scene;
		this.position = { ...position };
		this.team = team;
		this.flipped = flipped;

		this.modelPath = '/models/knights/Knight2.glb';
		this.model = null;

		// Create horse
		this.horse = new HorseEntity(
			scene,
			{
				x: position.x,
				y: position.y - 2.5,
				z: position.z,
			},
			flipped,
			false
		);

		// Initialize the model
		this.animator = new AnimationLoader('Opponent Knight', this.modelPath, scene);
		this.animator.load((loadedModel) => {
			this.model = loadedModel;

			// Set initial rotation and position
			this.model.rotation.set(0, this.flipped ? Math.PI / 2 : -Math.PI / 2, 0);
			this.updatePosition();

			// Add hitboxes to bones
			this.addHitboxes();
		});
	}

	addHitboxes() {
		this.model.traverse((child) => {
			if (child.isBone) {
				const targetName = child.name.toLowerCase();
				const sphere = new THREE.Mesh(
					new THREE.SphereGeometry(targetName.includes('head') ? 0.3 : 0.2, 4, 4),
					new THREE.MeshBasicMaterial({
						visible: GameState.debug,
						color: targetName.includes('head') ? 0xff0000 : 0x00ff00,
						transparent: true,
						opacity: 0.5,
					})
				);

				sphere.name = `[Hitbox] ${child.name}`;
				sphere.userData.type = 'opponent';
				sphere.userData.part = targetName.includes('head') ? 'head' : 'body';
				child.add(sphere);
			}
		});
	}

	updatePosition() {
		if (this.model) {
			this.model.position.set(this.position.x, this.position.y - 1.5, this.position.z);
		}
	}

	update(deltaTime, newPosition) {
		// Update position
		if (newPosition) {
			this.position = { ...newPosition };
			this.updatePosition();
		}

		// Update animator
		this.animator.update(deltaTime);

		// Update horse
		this.horse.update(deltaTime, {
			x: this.position.x,
			y: this.position.y - 2.5,
			z: this.position.z,
		});
	}

	playAnimation(name) {
		this.animator.playAnimation(name);
	}

	dispose() {
		// Clean up horse
		if (this.horse) {
			this.horse.dispose();
		}

		// Clean up animator
		this.animator.dispose();
	}
}
