// core/entities/KnightEntity.js
import * as THREE from 'three';
import { AnimationLoader } from '../../utils/AnimationLoader';
import { HorseEntity } from './HorseEntity';
import { LanceEntity } from '../objects/LanceEntity';
import { ShieldEntity } from '../objects/ShieldEntity';
import GameState from '../../game-state';
import { AILanceEntity } from '../objects/AILanceEntity';
import { PlayerLanceEntity } from '../objects/PlayerLanceEntity';

export class KnightEntity {
	constructor(
		scene,
		position,
		team,
		flipped,
		modelPath,
		isPlayer = false,
		cameraRef = null,
		povCameraAnchorRef = null
	) {
		this.scene = scene;
		this.position = { ...position };
		this.team = team;
		this.flipped = flipped;
		this.modelPath = modelPath;
		this.isPlayer = isPlayer;
		this.cameraRef = cameraRef;
		this.povCameraAnchorRef = povCameraAnchorRef;
		this.model = null;

		// References to important bones
		this.rightHandRef = null;
		this.leftHandRef = null;
		this.rightArmRef = null; // Added for arm pivot
		this.anchorRef = null; // For POV camera (used by player only)

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
			this.isPlayer
		);

		// Initialize the model
		this.animator = new AnimationLoader(
			`${this.isPlayer ? 'Player' : 'Opponent'} Knight`,
			this.modelPath,
			scene
		);
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
		console.log(
			`${this.team} ${
				this.isPlayer ? 'player' : 'opponent'
			}: Reset hit state for bout ${GameState.getBout()}`
		);

		// If lance has a reset method, call it
		if (this.lance && this.lance.reset) {
			this.lance.reset();
		}
	}

	// Method to register a hit
	registerHit(hitData) {
		if (!this.hasHitThisRound) {
			this.hasHitThisRound = true;
			console.log(
				`${this.team} ${this.isPlayer ? 'player' : 'opponent'}: Registered hit this round`
			);

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

				console.log(sphere);
				child.add(sphere);
				// console.log('Added hitbox for:', child.name);
			}
		});
	}

	getHitboxes() {
		if (!this.model) return [];

		const hitboxes = [];

		this.model.traverse((child) => {
			// Check if this is a hitbox
			if (child.userData?.isHitbox === true || child.name.toLowerCase().includes('hitbox')) {
				hitboxes.push(child);
			}
		});

		return hitboxes;
	}

	getHitbox(name) {
		if (!this.model) return [];

		this.model.traverse((child) => {
			// Check if this is a hitbox
			if (child.userData?.isHitbox === true || child.name.toLowerCase().includes('hitbox')) {
				if (child.name.includes(name)) {
					return child;
				}
			}
		});

		return null;
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
				} else if (childName.includes('head') && this.isPlayer) {
					this.anchorRef = child;
					console.log('Found head bone:', this.anchorRef.name);

					// Set POV camera anchor (player only)
					if (this.povCameraAnchorRef) {
						this.povCameraAnchorRef.current = this.anchorRef;
					}
				}
			}
		});

		// Create lance and shield once bones are found
		if (this.rightHandRef && this.rightArmRef) {
			if (this.isPlayer) {
				// Player uses regular lance with camera controls
				this.lance = new PlayerLanceEntity(
					this.scene,
					this.cameraRef,
					this.rightHandRef,
					this.rightArmRef,
					this
				);
			} else {
				// Opponent uses AI lance that targets the player
				// We need to get a reference to the player entity
				const playerEntity = GameState.playerEntity;

				this.lance = new AILanceEntity(
					this.scene,
					this.rightHandRef,
					this.rightArmRef,
					this,
					playerEntity
				);
			}
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
			// Position the knight model
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
