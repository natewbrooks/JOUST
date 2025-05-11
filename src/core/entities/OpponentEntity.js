// core/entities/OpponentEntity.js
import * as THREE from 'three';
import { AnimationLoader } from '../../utils/AnimationLoader';
import { HorseEntity } from './HorseEntity';
import { LanceEntity } from '../objects/LanceEntity';
import { ShieldEntity } from '../objects/ShieldEntity';
import GameState from '../../game-state';

export class OpponentEntity {
	constructor(scene, position, team, flipped) {
		this.scene = scene;
		this.position = { ...position };
		this.team = team;
		this.flipped = flipped;

		this.modelPath = '/models/knights/Knight2.glb';
		this.model = null;

		// References to important bones
		this.rightHandRef = null;
		this.leftHandRef = null;
		this.rightArmRef = null; // Added for arm pivot

		// For smooth hand position updates
		this.rightHandPosRef = new THREE.Vector3();
		this.rightHandTargetRef = new THREE.Vector3();

		// Combat state
		this.hasHitThisRound = false;

		// Create horse
		this.horse = new HorseEntity(
			scene,
			{
				x: position.x,
				y: position.y - 2.5,
				z: position.z,
			},
			this.flipped,
			false
		);

		// Initialize the model
		this.animator = new AnimationLoader('Opponent Knight', this.modelPath, scene);
		this.animator.load((loadedModel) => {
			this.model = loadedModel;

			// Mark this model as belonging to this team
			this.model.userData.type = this.team;

			// Set initial rotation and position
			this.model.rotation.set(0, this.flipped ? Math.PI / 2 : -Math.PI / 2, 0);
			this.updatePosition();

			// Add hitboxes to bones
			this.addHitboxes();

			// Find important bones
			this.findBones();
		});

		// Subscribe to bout events to reset hit state
		this.setupGameStateListeners();

		console.log(this.position);
	}

	setupGameStateListeners() {
		// Reset hit state when new bout starts
		GameState.on('boutStart', (data) => {
			this.resetHitState();
		});
	}

	// Reset combat state for new round
	resetHitState() {
		this.hasHitThisRound = false;
		console.log(`${this.team} opponent: Reset hit state for bout ${GameState.getBout()}`);

		// If lance has a reset method, call it
		if (this.lance && this.lance.reset) {
			this.lance.reset();
		}
	}

	// Method to register a hit
	registerHit(hitData) {
		if (!this.hasHitThisRound) {
			this.hasHitThisRound = true;
			console.log(`${this.team} opponent: Registered hit this round`);

			// Report hit to GameState
			GameState.setBoutMetadata(GameState.getBout(), this.team, hitData);
		}
	}

	addHitboxes() {
		this.model.traverse((child) => {
			if (child.isBone) {
				const targetName = child.name.toLowerCase();
				const sphere = new THREE.Mesh(
					new THREE.SphereGeometry(
						targetName.includes('head') ? 0.4 : 0.3,
						targetName.includes('head') ? 6 : 4,
						targetName.includes('head') ? 8 : 4
					),
					new THREE.MeshBasicMaterial({
						visible: GameState.debug,
						color: targetName.includes('head') ? 0xff0000 : 0x00ff00,
						transparent: true,
						opacity: 0.5,
					})
				);

				sphere.name = `[HITBOX] ${targetName}`;
				sphere.userData.type = this.team; // Use this team for correct targeting
				sphere.userData.part = targetName;

				// Mark as a hitbox for the lance to detect
				sphere.userData.isHitbox = true;

				child.add(sphere);
				// console.log('Added hitbox for:', child.name);
			}
		});
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
				} else if (childName.includes('armr')) {
					// Find the upper arm bone for the pivot
					this.rightArmRef = child;
					console.log('Found Arm.R bone:', this.rightArmRef.name);
				} else if (childName.includes('arml')) {
					this.leftHandRef = child;
					console.log('Found Arm.L bone:', this.leftHandRef.name);
				}
			}
		});

		// Create lance and shield once bones are found
		if (this.rightHandRef && this.rightArmRef) {
			// Pass this entity as the owner to the lance
			this.lance = new LanceEntity(
				this.scene,
				null, // No camera for opponent (if you want AI-controlled)
				this.rightHandRef,
				this.rightArmRef,
				this // Pass this entity as the owner
			);
		}

		if (this.leftHandRef) {
			this.shield = new ShieldEntity(this.leftHandRef);
		}
	}

	flip() {
		this.flipped = !this.flipped;
		this.model.rotation.set(0, this.flipped ? Math.PI / 2 : -Math.PI / 2, 0);
		this.horse.flip();
	}

	updatePosition() {
		if (this.model) {
			// Position the opponent model
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

		// Update hitbox visibility based on debug mode
		// this.model?.traverse((child) => {
		// 	if (child.userData?.isHitbox && child.material) {
		// 		child.material.visible = GameState.debug;
		// 	}
		// });
	}

	playAnimation(name) {
		this.animator.playAnimation(name);
	}

	dispose() {
		// Clean up horse
		if (this.horse) {
			this.horse.dispose();
		}

		// Clean up lance
		if (this.lance) {
			this.lance.dispose();
		}

		// Clean up shield
		if (this.shield) {
			this.shield.dispose();
		}

		// Clean up animator
		this.animator.dispose();
	}
}
