// core/entities/PlayerEntity.js
import * as THREE from 'three';
import { AnimationLoader } from '../../utils/AnimationLoader';
import { HorseEntity } from './HorseEntity';
import { LanceEntity } from '../objects/LanceEntity';
import { ShieldEntity } from '../objects/ShieldEntity';
import GameState from '../../game-state';

export class PlayerEntity {
	constructor(scene, position, team, flipped, cameraRef, povCameraAnchorRef) {
		this.scene = scene;
		this.position = { ...position };
		this.team = team;
		this.flipped = flipped;
		this.cameraRef = cameraRef;
		this.povCameraAnchorRef = povCameraAnchorRef;

		this.modelPath = '/models/knights/Knight.glb';
		this.model = null;

		// References to important bones
		this.rightHandRef = null;
		this.leftHandRef = null;
		this.anchorRef = null; // For POV camera

		// For smooth hand position updates
		this.rightHandPosRef = new THREE.Vector3();
		this.rightHandTargetRef = new THREE.Vector3();

		// Child entities
		this.horse = new HorseEntity(
			scene,
			{
				x: position.x,
				y: position.y - 2.5,
				z: position.z,
			},
			flipped,
			true
		);

		// Initialize the model
		this.animator = new AnimationLoader('Player Knight', this.modelPath, scene);
		this.animator.load((loadedModel) => {
			this.model = loadedModel;

			// Set initial rotation and position
			this.model.rotation.set(0, this.flipped ? Math.PI / 2 : -Math.PI / 2, 0);
			this.updatePosition();

			// Find important bones
			this.findBones();

			// Create lance and shield once bones are found
			if (this.rightHandRef) {
				this.lance = new LanceEntity(this.scene, this.cameraRef, this.rightHandPosRef);
			}

			if (this.leftHandRef) {
				this.shield = new ShieldEntity(this.leftHandRef);
			}
		});

		console.log(this.position);
	}

	findBones() {
		this.model.traverse((child) => {
			if (child.isBone) {
				const childName = child.name.toLowerCase();

				if (childName.includes('handr')) {
					this.rightHandRef = child;
					console.log('Found Hand.R bone:', this.rightHandRef.name);

					// Initialize hand position
					const pos = new THREE.Vector3();
					this.rightHandRef.getWorldPosition(pos);
					this.rightHandPosRef.copy(pos);
					this.rightHandTargetRef.copy(pos);
				} else if (childName.includes('head')) {
					this.anchorRef = child;
					console.log('Found head bone:', this.anchorRef.name);

					// Set POV camera anchor
					if (this.povCameraAnchorRef) {
						this.povCameraAnchorRef.current = this.anchorRef;
					}
				} else if (childName.includes('arml')) {
					this.leftHandRef = child;
					console.log('Found Arm.L bone:', this.leftHandRef.name);
				}
			}
		});
	}

	updatePosition() {
		if (this.model) {
			// Uncomment this line to correctly position the player model
			this.model.position.set(this.position.x, this.position.y - 1.5, this.position.z);

			// Log the model position for debugging
			if (GameState.debug && Math.random() < 0.01) {
				console.log('Player model position:', this.model.position);

				// Get world position
				const worldPos = new THREE.Vector3();
				this.model.getWorldPosition(worldPos);
				console.log('Player world position:', worldPos);
			}
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

		// Update hand position for lance
		if (this.rightHandRef) {
			// Get current world position of hand
			const currentPos = new THREE.Vector3();
			this.rightHandRef.getWorldPosition(currentPos);

			// Update target position
			this.rightHandTargetRef.copy(currentPos).add(new THREE.Vector3(0.25, 0.05, 0.05));

			// Smooth position update for lance
			this.rightHandPosRef.lerp(this.rightHandTargetRef, 1);

			// Update lance
			if (this.lance) {
				this.lance.update(deltaTime, this.rightHandPosRef.clone());
			}
		}

		// Update shield
		if (this.shield) {
			this.shield.update(deltaTime);
		}
	}

	playAnimation(name) {
		this.animator.playAnimation(name);
	}

	dispose() {
		// Clean up entities
		if (this.horse) {
			this.horse.dispose();
		}

		if (this.lance) {
			this.lance.dispose();
		}

		if (this.shield) {
			this.shield.dispose();
		}

		// Clean up animator
		this.animator.dispose();
	}
}
