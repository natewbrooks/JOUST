// core/objects/LanceEntity.js
import * as THREE from 'three';
import { ModelLoader } from '../../utils/ModelLoader';
import GameState from '../../game-state';
import audioManager from '../../utils/AudioManager';
import { PlayerEntity } from '../entities/PlayerEntity';

export class LanceEntity {
	constructor(scene, handRef, armRef, ownerEntity = null) {
		this.scene = scene;
		this.handRef = handRef;
		this.armRef = armRef;
		this.ownerEntity = ownerEntity;

		// Combat state
		this.hasHitThisRound = false;

		this.modelPath = '/models/lance/Lance.glb';
		this.model = null;

		// Raycasting for hit detection
		this.rayLine = null;
		this.tipSphere = null;
		this.raycaster = new THREE.Raycaster();

		// Mesh highlighting - track individual spheres
		this.highlightedHitboxes = new Set();
		this.originalMaterials = new Map();
		this.highlightMaterial = new THREE.MeshBasicMaterial({
			color: 0xffff00,
			transparent: true,
			opacity: 0.8,
			emissive: 0xffff00,
			emissiveIntensity: 0.5,
		});

		// Flag for the update loop
		this.isUpdating = false;
		this.lastPositionRef = new THREE.Vector3();

		// Speed tracking for MPH calculation
		this.previousPosition = new THREE.Vector3();
		this.currentSpeed = 0;

		// Team identification
		this.team = ownerEntity ? ownerEntity.team : 'red';

		// Initialize the model
		this.modelLoader = new ModelLoader('Lance', this.modelPath);
		this.modelLoader.load((loadedModel) => {
			this.model = loadedModel;

			// Add the model to the hand
			this.handRef.add(this.model);
			this.model.position.set(0, 0.25, 0);

			// Set material based on team
			this.setMaterialToTeam(this.team);

			// Initialize debug visualization
			this.createDebugElements();

			// Additional initialization after model is loaded
			this.onModelLoaded();
		});
	}

	// Hook for subclasses to override
	onModelLoaded() {
		// Subclasses can implement this
	}

	createDebugSphere(position, radius = 0.1, color = 0xff0000, name = '[DEBUG] Custom Sphere') {
		const geometry = new THREE.SphereGeometry(radius, 16, 16);
		const material = new THREE.MeshBasicMaterial({ color });
		const sphere = new THREE.Mesh(geometry, material);
		sphere.position.copy(position);
		sphere.name = name;
		sphere.visible = GameState.debug;
		return sphere;
	}

	createDebugElements() {
		// Create debug line for hit detection ray (short range - RED)
		const lineMaterial = new THREE.LineBasicMaterial({
			color: 0xff0000,
			linewidth: 2,
		});
		const points = [new THREE.Vector3(), new THREE.Vector3()];
		const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
		this.rayLine = new THREE.Line(lineGeometry, lineMaterial);
		this.rayLine.name = '[DEBUG] Lance Hit Ray';
		this.rayLine.visible = GameState.debug;
		this.scene.add(this.rayLine);

		// Create tip sphere for hit detection visualization
		this.tipSphere = this.createDebugSphere(
			new THREE.Vector3(),
			0.1,
			0x00ff00,
			'[DEBUG] Tip Sphere'
		);
		this.scene.add(this.tipSphere);

		// Initialize position based on hand ref world position
		if (this.handRef) {
			this.handRef.getWorldPosition(this.lastPositionRef).add(new THREE.Vector3(0, 1, 0.25));
			this.previousPosition.copy(this.lastPositionRef);
		}
	}

	// Reset the lance state for a new round
	reset() {
		this.hasHitThisRound = false;
		console.log(`Lance reset for new round (${this.team} team)`);
	}

	setMaterialToTeam(team) {
		if (team !== 'red' && team !== 'blue') return;

		let material;

		switch (team) {
			case 'red':
				material = new THREE.MeshStandardMaterial({ color: 0xbf423d });
				break;
			case 'blue':
				material = new THREE.MeshStandardMaterial({ color: 0x03838f });
				break;
		}

		this.model?.traverse((child) => {
			if (!child.isMesh) return;

			if (child.name.includes('Base')) {
				child.material = material;
			}
		});
	}

	calculateSpeed(deltaTime) {
		if (!this.previousPosition || !this.lastPositionRef) return;

		// Calculate distance moved
		const distance = this.lastPositionRef.distanceTo(this.previousPosition);

		// Calculate speed in units per second
		const unitsPerSecond = distance / deltaTime;

		// Convert to MPH (assuming 1 unit = 1 meter)
		// 1 meter/second = 2.237 MPH
		this.currentSpeed = unitsPerSecond * 2.237;

		// Update previous position for next frame
		this.previousPosition.copy(this.lastPositionRef);
	}

	// Check if object is a hitbox sphere
	isHitboxSphere(object) {
		return (
			object.isMesh &&
			object.geometry instanceof THREE.SphereGeometry &&
			(object.name.includes('[Hitbox]') ||
				object.name.includes('hitbox') ||
				object.name.includes('Hitbox') ||
				object.userData?.isHitbox)
		);
	}

	// Check if an object belongs to the owner entity
	isPartOfOwnerEntity(object) {
		if (!this.ownerEntity) return false;

		// Check if object has the same team as the owner
		if (object.userData?.type === this.team) return true;

		// Recursively check parent chain
		let parent = object.parent;
		while (parent) {
			if (
				parent === this.ownerEntity.model ||
				(parent.userData && parent.userData.type === this.team)
			) {
				return true;
			}
			parent = parent.parent;
		}

		return false;
	}

	// Find all hitbox spheres in a given object
	findHitboxSpheres(rootObject) {
		const hitboxSpheres = [];

		rootObject.traverse((child) => {
			if (this.isHitboxSphere(child)) {
				hitboxSpheres.push(child);
			}
		});

		return hitboxSpheres;
	}

	// Highlight only the specified hitbox spheres
	highlightHitboxSpheres(spheres) {
		// Create a set of spheres that should be highlighted
		const spheresToHighlight = new Set(spheres);

		// Unhighlight spheres that should no longer be highlighted
		this.highlightedHitboxes.forEach((sphere) => {
			if (!spheresToHighlight.has(sphere)) {
				this.unhighlightSphere(sphere);
			}
		});

		// Highlight new spheres
		spheres.forEach((sphere) => {
			if (!this.highlightedHitboxes.has(sphere)) {
				this.highlightSphere(sphere);
			}
		});
	}

	highlightSphere(sphere) {
		// Add to highlighted set
		this.highlightedHitboxes.add(sphere);

		// Store original material
		if (sphere.material) {
			sphere.visible = true;

			if (Array.isArray(sphere.material)) {
				this.originalMaterials.set(sphere, [...sphere.material]);
				sphere.material = new Array(sphere.material.length).fill(this.highlightMaterial);
			} else {
				this.originalMaterials.set(sphere, sphere.material);
				sphere.material = this.highlightMaterial;
			}
		}
	}

	unhighlightSphere(sphere) {
		// Remove from highlighted set
		this.highlightedHitboxes.delete(sphere);

		// Restore original material
		if (this.originalMaterials.has(sphere)) {
			sphere.material = this.originalMaterials.get(sphere);
			if (!GameState.debug) {
				sphere.visible = false;
			}
			this.originalMaterials.delete(sphere);
		}
	}

	clearAllHighlights() {
		this.highlightedHitboxes.forEach((sphere) => {
			this.unhighlightSphere(sphere);
		});
	}

	// Common update method for all lances
	update(deltaTime) {
		// Get the current world position of the hand
		if (this.handRef) {
			this.handRef.getWorldPosition(this.lastPositionRef);
		}

		// Calculate current speed
		this.calculateSpeed(deltaTime);

		// Update debug elements visibility based on GameState
		if (this.rayLine) {
			this.rayLine.visible = GameState.debug;
		}

		if (this.tipSphere) {
			this.tipSphere.visible = GameState.debug;
		}

		// Skip if critical components aren't ready
		if (!this.model || !this.handRef) return;

		// Check for collisions
		this.checkCollisions();

		// Call the aiming method (to be implemented by subclasses)
		this.updateAiming(deltaTime);
	}

	// Method to be overridden by subclasses for specific aiming behavior
	updateAiming(deltaTime) {
		// To be implemented by subclasses
	}

	// Get objects that can be targets for hit detection
	getTargetObjects() {
		// Find opponent team type
		const opponentTeam = this.team === 'red' ? 'blue' : 'red';

		// Find potential target objects
		const potentialTargets = [];
		this.scene.traverse((object) => {
			// Only include objects from opponent team or with hitbox in name
			// AND make sure they're not part of the owner entity
			if (
				(object.userData?.type === opponentTeam || object.name.toLowerCase().includes('hitbox')) &&
				!this.isPartOfOwnerEntity(object)
			) {
				potentialTargets.push(object);
			}
		});

		return potentialTargets;
	}

	// Create a set of objects to ignore in raycasting
	getIgnoredObjects() {
		const ignored = new Set();

		// Add owner entity's model and all its children
		if (this.ownerEntity && this.ownerEntity.model) {
			this.ownerEntity.model.traverse((child) => {
				ignored.add(child.uuid);
			});
		}

		// Add lance model and all its children
		if (this.model) {
			this.model.traverse((child) => {
				ignored.add(child.uuid);
			});
		}

		// Add hand reference and all its children
		if (this.handRef) {
			this.handRef.traverse((child) => {
				ignored.add(child.uuid);
			});
		}

		// Add debug elements
		if (this.rayLine) ignored.add(this.rayLine.uuid);
		if (this.tipSphere) ignored.add(this.tipSphere.uuid);

		return ignored;
	}

	// Method to check for collisions with opponent hitboxes
	checkCollisions() {
		if (!GameState.can_move || this.hasHitThisRound || !this.raycaster) return;

		// Get hand world position as raycaster origin
		const offset = new THREE.Vector3(0, 0.25, 0);
		const handWorldPos = this.lastPositionRef
			.clone()
			.add(offset.clone().applyQuaternion(this.handRef.getWorldQuaternion(new THREE.Quaternion())));

		// The direction and length of the ray should be set by subclasses through updateAiming()
		// But we need to ensure the raycaster is properly positioned
		const rayDirection = this.raycaster.ray.direction.clone();

		// Get target objects and ignored objects
		const potentialTargets = this.getTargetObjects();
		const ignored = this.getIgnoredObjects();

		// Check for actual hit detection (short range)
		const hitRayLength = 2.5;
		this.raycaster.far = hitRayLength;

		const intersects = this.raycaster
			.intersectObjects(potentialTargets, true)
			.filter((hit) => !ignored.has(hit.object.uuid));

		// Update debug ray visualization
		if (this.rayLine && GameState.debug) {
			const hitRayEnd = handWorldPos.clone().add(rayDirection.clone().multiplyScalar(hitRayLength));
			const positions = this.rayLine.geometry.attributes.position.array;
			positions[0] = handWorldPos.x;
			positions[1] = handWorldPos.y;
			positions[2] = handWorldPos.z;
			positions[3] = hitRayEnd.x;
			positions[4] = hitRayEnd.y;
			positions[5] = hitRayEnd.z;
			this.rayLine.geometry.attributes.position.needsUpdate = true;

			// Update tip sphere
			if (this.tipSphere) {
				this.tipSphere.position.copy(hitRayEnd);
			}
		}

		// Process actual hits
		if (intersects.length > 0) {
			const firstHit = intersects[0].object;
			console.log('HIT', firstHit);

			const isHitbox = firstHit.userData.isHitbox;
			if (!isHitbox) return;

			console.log(
				'✅ Hit',
				this.ownerEntity instanceof PlayerEntity ? 'opponent' : 'player',
				':',
				firstHit
			);
			audioManager.playCheer(0.5);
			this.hasHitThisRound = true;

			// Determine body part hit
			let bodyPart = 'other'; // Default to other for 1 point
			if (firstHit.userData.part) {
				bodyPart = firstHit.userData.part;
			}

			// Calculate points based on body part
			let ptsEarned = 0;
			switch (bodyPart) {
				case 'head':
				case 'neck':
					ptsEarned = 3;
					console.log('💥 HEADSHOT! (+3 points)');
					audioManager.playHeadshot(0.3);
					break;
				case 'spine':
				case 'shoulder':
				case 'bone':
					ptsEarned = 2;
					console.log('🎯 Body hit! (+2 points)');
					break;
				default:
					ptsEarned = 1;
					console.log('🎯 Hit! (+1 point)');
					audioManager.playOuch(0.3);
					audioManager.playNeigh(0.4);
					break;
			}

			console.log(`🎯 Hit on ${bodyPart}! (${this.currentSpeed.toFixed(1)} MPH)`);

			// Create hit data
			const hitData = {
				part_hit: bodyPart,
				pts_earned: ptsEarned,
				mph_on_contact: parseFloat(this.currentSpeed.toFixed(1)),
			};

			// Register hit through the owner entity if available
			if (this.ownerEntity && this.ownerEntity.registerHit) {
				this.ownerEntity.registerHit(hitData);
			} else {
				// Fallback to direct GameState call if no owner entity
				const currentBout = GameState.getBout();
				if (currentBout > 0) {
					GameState.setBoutMetadata(currentBout, this.team, hitData);
					console.log(`Bout ${currentBout} metadata logged for ${this.team} team`);
				}
			}
		}
	}

	dispose() {
		// Clear any highlighting before disposal
		this.clearAllHighlights();

		// Dispose of highlight material
		if (this.highlightMaterial) {
			this.highlightMaterial.dispose();
			this.highlightMaterial = null;
		}

		// Remove model from hand/scene
		if (this.model) {
			if (this.handRef && this.handRef.children.includes(this.model)) {
				this.handRef.remove(this.model);
			} else {
				this.scene.remove(this.model);
			}
		}

		// Remove debug elements
		if (this.rayLine) {
			this.scene.remove(this.rayLine);
			this.rayLine.geometry.dispose();
			this.rayLine.material.dispose();
			this.rayLine = null;
		}

		if (this.tipSphere) {
			this.scene.remove(this.tipSphere);
			this.tipSphere.geometry.dispose();
			this.tipSphere.material.dispose();
			this.tipSphere = null;
		}

		// Clear stored materials
		this.originalMaterials.clear();
	}
}
