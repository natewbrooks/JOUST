// core/entities/HorseEntity.js
import * as THREE from 'three';
import { AnimationLoader } from '../../utils/AnimationLoader';

export class HorseEntity {
	constructor(scene, position, flipped, isPlayer) {
		this.scene = scene;
		this.position = { ...position };
		this.flipped = flipped;
		this.isPlayer = isPlayer;

		this.modelPath = '/models/horse/Horse.glb';
		this.materialPath = '/models/horse/Materials/';
		this.materials = {
			White: this.materialPath + '/MaterialWhite.png',
			Gray: this.materialPath + '/MaterialGray.png',
			Brown: this.materialPath + '/MaterialBrown.png',
			LightBrown: this.materialPath + '/MaterialLightBrown.png',
			BrownWhite: this.materialPath + '/MaterialBrownWhite.png',
			Sepia: this.materialPath + '/MaterialSepia.png',
			Inverted: this.materialPath + '/MaterialInverted.png',
			Funky: this.materialPath + '/MaterialFunky.png',
			Solarized: this.materialPath + '/MaterialSolarized.png',
			Scrambled: this.materialPath + '/MaterialScrambled.png',
			Polarized: this.materialPath + '/MaterialPolarized.png',
		};

		this.currentAnimation = '';

		// Initialize the model
		this.animator = new AnimationLoader('Horse', this.modelPath, scene);
		this.animator.load((loadedModel) => {
			this.model = loadedModel;

			// Set initial rotation and position
			this.model.position.set(this.position.x, this.position.y, this.position.z);
			this.model.rotation.set(0, flipped ? Math.PI / 2 : -Math.PI / 2, 0);

			// Apply random material
			this.randomizeMaterial();

			// Start animation
			this.playAnimation('Run');
		});
	}

	randomizeMaterial() {
		const materialKeys = Object.keys(this.materials);
		const materialValues = Object.values(this.materials);

		const randomIndex = Math.floor(Math.random() * materialValues.length);
		const randomTexturePath = materialValues[randomIndex];
		const randomTextureName = materialKeys[randomIndex];

		this.animator.setMaterial(randomTexturePath, randomTextureName);
	}

	flip() {
		this.flipped = !this.flipped;
		this.model.rotation.set(0, this.flipped ? Math.PI / 2 : -Math.PI / 2, 0);
	}

	faceKing() {
		this.model.rotation.set(0, 0, 0);
	}

	updatePosition() {
		if (this.model) {
			this.model.position.set(this.position.x, this.position.y, this.position.z);
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
	}

	playAnimation(name) {
		this.currentAnimation = name;
		this.animator.playAnimation(name);
	}

	dispose() {
		// Clean up animator
		this.animator.dispose();
	}
}
