// core/objects/AILanceEntity.js
import * as THREE from 'three';
import { LanceEntity } from './LanceEntity';
import gameStateManager from '../../GameStateManager';

export class AILanceEntity extends LanceEntity {
	constructor(scene, handRef, armRef, ownerEntity, targetEntity) {
		// Call base constructor (no camera needed for AI)
		super(scene, handRef, armRef, ownerEntity);

		// Store reference to the target entity (usually the player)
		this.targetEntity = targetEntity;

		// AI aiming properties
		this.aimVariance = 0.15; // Small amount of randomness for slight variance
		this.aimUpdateInterval = 0.5;
		this.timeSinceLastAimUpdate = 0;
		this.currentAimPoint = new THREE.Vector3();
		this.targetAimPoint = new THREE.Vector3();
		this.aimSmoothingFactor = 0.05; // Lower = smoother but slower (0-1)

		// Targeting behavior with weighted hitbox preferences
		this.hitboxWeights = {
			head: 0.6, // 60% chance to target head
			neck: 0.1, // 10% chance
			shoulderl: 0.05,
			shoulderr: 0.05,
			spine: 0.05,
			legl: 0.05,
			legr: 0.05,
			arml: 0.025,
			armr: 0.025,
		};

		// Forward orientation check
		this.passedTarget = false;

		// Preview raycasting for highlighting
		this.previewRayLine = null;
		this.previewRaycaster = new THREE.Raycaster();
		this.previewRayLength = 10;
		this.previewTipSphere = null;

		// Set up extra debug elements after model is loaded
		this.onModelLoaded = () => {
			this.createPreviewRay();
		};
	}

	createPreviewRay() {
		// Create debug line for preview ray
		const previewLineMaterial = new THREE.LineBasicMaterial({
			color: 0x00ff00,
			transparent: true,
			opacity: 0.7,
			linewidth: 3,
		});
		const previewPoints = [new THREE.Vector3(), new THREE.Vector3()];
		const previewLineGeometry = new THREE.BufferGeometry().setFromPoints(previewPoints);
		this.previewRayLine = new THREE.Line(previewLineGeometry, previewLineMaterial);
		this.previewRayLine.name = '[DEBUG] AI Lance Preview Ray';
		this.previewRayLine.visible = gameStateManager.debug;
		this.scene.add(this.previewRayLine);

		// Create preview tip sphere
		this.previewTipSphere = this.createDebugSphere(
			new THREE.Vector3(),
			0.15,
			0x0000ff,
			'[DEBUG] AI Preview Tip Sphere'
		);
		this.scene.add(this.previewTipSphere);
	}

	// Helper method to select a hitbox based on weighted probabilities
	selectWeightedHitbox() {
		const random = Math.random();
		let cumulativeProbability = 0;

		for (const [hitbox, probability] of Object.entries(this.hitboxWeights)) {
			cumulativeProbability += probability;
			if (random < cumulativeProbability) {
				return hitbox;
			}
		}

		// Default to head if somehow we didn't select one
		return 'head';
	}

	updateAiming(deltaTime) {
		// Update aim point periodically
		this.timeSinceLastAimUpdate += deltaTime;
		if (this.timeSinceLastAimUpdate >= this.aimUpdateInterval) {
			this.updateAimPoint();
			this.timeSinceLastAimUpdate = 0;
		}

		// Skip if we don't have an aim point yet
		if (!this.targetAimPoint || !this.model) return;

		// Smoothly interpolate current aim point
		this.currentAimPoint.lerp(this.targetAimPoint, this.aimSmoothingFactor);

		// Get hand position for raycaster origin
		const offset = new THREE.Vector3(0, 0.25, 0);
		const handWorldPos = this.lastPositionRef
			.clone()
			.add(offset.clone().applyQuaternion(this.handRef.getWorldQuaternion(new THREE.Quaternion())));

		// Calculate direction from hand to aim point
		let rayDirection = new THREE.Vector3()
			.subVectors(this.currentAimPoint, handWorldPos)
			.normalize();

		// Only fix orientation AFTER passing the target, allowing full movement before passing
		if (this.passedTarget) {
			// Get the forward direction of the knight
			const knightForward = this.ownerEntity.flipped
				? new THREE.Vector3(1, 0, 0)
				: new THREE.Vector3(-1, 0, 0);

			// ONLY force forward orientation if we're truly past and tried to point backwards
			// This allows the lance to still move freely horizontally unless it's trying to
			// point backwards after passing
			const dotWithForward = rayDirection.dot(knightForward);
			if (dotWithForward < -0.2) {
				// Only correct when significantly pointing backward
				// Create a new direction that's mostly forward but preserves some of the original y-component
				// to allow for continued vertical aiming
				const originalY = rayDirection.y;
				rayDirection.copy(knightForward);
				rayDirection.y = originalY * 0.5; // Preserve some of the vertical aim
				rayDirection.normalize();
			}
		}

		// Set up raycasters
		this.raycaster.set(handWorldPos, rayDirection);
		if (this.previewRaycaster) {
			this.previewRaycaster.set(handWorldPos, rayDirection);
		}

		// Aim the model using local transformations
		const handRotation = new THREE.Quaternion();
		this.handRef.getWorldQuaternion(handRotation);

		// Convert ray direction to local space of the hand
		const localDirection = rayDirection.clone();
		const inverseHandRotation = handRotation.clone().invert();
		localDirection.applyQuaternion(inverseHandRotation);

		// Create rotation for the lance in local space
		const forwardVector = new THREE.Vector3(0, 0, 1);
		const localQuaternion = new THREE.Quaternion().setFromUnitVectors(
			forwardVector,
			localDirection
		);

		// Apply the rotation with smoothing
		const currentRotation = this.model.quaternion.clone();
		currentRotation.slerp(localQuaternion, 0.2);
		this.model.quaternion.copy(currentRotation);

		// Calculate ray end points
		const hitRayLength = 2.5;
		const hitRayEnd = handWorldPos.clone().add(rayDirection.clone().multiplyScalar(hitRayLength));

		const previewRayEnd = handWorldPos
			.clone()
			.add(rayDirection.clone().multiplyScalar(this.previewRayLength));

		if (this.previewRaycaster) {
			this.previewRaycaster.far = this.previewRayLength;
		}

		// Update debug visualizations
		if (gameStateManager.debug) {
			if (this.rayLine) {
				const positions = this.rayLine.geometry.attributes.position.array;
				positions[0] = handWorldPos.x;
				positions[1] = handWorldPos.y;
				positions[2] = handWorldPos.z;
				positions[3] = hitRayEnd.x;
				positions[4] = hitRayEnd.y;
				positions[5] = hitRayEnd.z;
				this.rayLine.geometry.attributes.position.needsUpdate = true;
			}

			if (this.previewRayLine) {
				const positions = this.previewRayLine.geometry.attributes.position.array;
				positions[0] = handWorldPos.x;
				positions[1] = handWorldPos.y;
				positions[2] = handWorldPos.z;
				positions[3] = previewRayEnd.x;
				positions[4] = previewRayEnd.y;
				positions[5] = previewRayEnd.z;
				this.previewRayLine.geometry.attributes.position.needsUpdate = true;
			}

			if (this.tipSphere) {
				this.tipSphere.position.copy(hitRayEnd);
			}

			if (this.previewTipSphere) {
				this.previewTipSphere.position.copy(previewRayEnd);
			}
		}

		// Update hitbox highlighting
		this.updateHitboxHighlighting();
	}

	updateHitboxHighlighting() {
		if (!this.previewRaycaster) return;

		// Find opponent team type
		const opponentTeam = this.team === 'red' ? 'blue' : 'red';

		// Find potential target objects
		const potentialTargets = [];
		this.scene.traverse((object) => {
			if (object.userData?.type === opponentTeam || object.name.toLowerCase().includes('hitbox')) {
				potentialTargets.push(object);
			}
		});

		// Create ignore list
		const ignored = new Set();
		if (this.model) {
			this.model.traverse((child) => {
				ignored.add(child.uuid);
			});
		}
		if (this.handRef) {
			this.handRef.traverse((child) => {
				ignored.add(child.uuid);
			});
		}
		if (this.rayLine) ignored.add(this.rayLine.uuid);
		if (this.previewRayLine) ignored.add(this.previewRayLine.uuid);
		if (this.tipSphere) ignored.add(this.tipSphere.uuid);
		if (this.previewTipSphere) ignored.add(this.previewTipSphere.uuid);

		// Check preview intersections for highlighting
		const previewIntersects = this.previewRaycaster
			.intersectObjects(potentialTargets, true)
			.filter((hit) => !ignored.has(hit.object.uuid));

		// Find only hitbox spheres that the ray intersects
		const hitSpheres = [];
		previewIntersects.forEach((hit) => {
			if (this.isHitboxSphere(hit.object)) {
				hitSpheres.push(hit.object);
			}
		});

		// Highlight only the intersected hitbox spheres
		this.highlightHitboxSpheres(hitSpheres);
	}

	updateAimPoint() {
		if (!this.targetEntity || !this.ownerEntity) return;

		// Get the forward direction of the owning knight
		const knightForward = new THREE.Vector3(0, 0, 0);

		// Determine knight facing direction based on flipped state
		if (this.ownerEntity.flipped) {
			knightForward.set(1, 0, 0); // Facing right (positive X)
		} else {
			knightForward.set(-1, 0, 0); // Facing left (negative X)
		}

		// Get positions of knight and player
		const knightPosition = new THREE.Vector3();
		const playerPosition = new THREE.Vector3();

		if (this.ownerEntity.model) {
			this.ownerEntity.model.getWorldPosition(knightPosition);
		}

		if (this.targetEntity.model) {
			this.targetEntity.model.getWorldPosition(playerPosition);
		}

		// Calculate vector from knight to player
		const toPlayer = new THREE.Vector3().subVectors(playerPosition, knightPosition);

		// Check if we've passed the target - using a more reliable method:
		// Compare the sign of x-positions (assuming a horizontal jousting setup)
		// and the knight's orientation to determine if they've passed
		if (this.ownerEntity.flipped) {
			// Knight faces right (+X)
			this.passedTarget = knightPosition.x > playerPosition.x;
		} else {
			// Knight faces left (-X)
			this.passedTarget = knightPosition.x < playerPosition.x;
		}

		// Set target position
		const targetPosition = new THREE.Vector3();

		// Select a hitbox using weighted random selection
		if (this.targetEntity.getHitbox) {
			// Choose a hitbox based on weighted probabilities
			const hitboxToTarget = this.selectWeightedHitbox();
			const hitTarget = this.targetEntity.getHitbox(hitboxToTarget);

			if (hitTarget) {
				// Get the world position of the selected hitbox
				hitTarget.getWorldPosition(targetPosition);
				// console.log(`AI targeting: ${hitboxToTarget}`);
			} else {
				// If somehow no hitbox was found, target player position
				targetPosition.copy(playerPosition);
				targetPosition.y += 0.5; // Aim at upper body
			}
		} else {
			// Fallback if targeting entity has no hitboxes
			targetPosition.copy(playerPosition);
			targetPosition.y += 0.5; // Aim at upper body height
		}

		// Add slight variance to aim point
		if (this.aimVariance > 0) {
			const variance = this.aimVariance;
			targetPosition.x += (Math.random() * 2 - 1) * variance;
			targetPosition.y += (Math.random() * 2 - 1) * variance;
			targetPosition.z += (Math.random() * 2 - 1) * variance;
		}

		// Store as target aim point
		this.targetAimPoint.copy(targetPosition);
	}

	checkCollisions() {
		if (!gameStateManager.can_move || this.hasHitThisRound || !this.raycaster) return;

		// Get ray origin (hand position)
		const offset = new THREE.Vector3(0, 0.25, 0);
		const handWorldPos = this.lastPositionRef
			.clone()
			.add(offset.clone().applyQuaternion(this.handRef.getWorldQuaternion(new THREE.Quaternion())));

		// Ensure ray direction is set
		const rayDirection = this.raycaster.ray.direction.clone();

		// Create a list of all potential hitboxes
		const hitboxes = [];
		for (const hitbox in this.hitboxWeights) {
			const targetHitbox = this.targetEntity?.getHitbox(hitbox);
			if (targetHitbox) {
				hitboxes.push(targetHitbox);
			}
		}

		if (hitboxes.length === 0) return;

		// Ensure ray intersects with any hitbox
		this.raycaster.far = 2.5;
		const intersects = this.raycaster.intersectObjects(hitboxes, true);

		if (intersects.length === 0) return;

		const firstHit = intersects[0].object;

		if (!firstHit.userData?.isHitbox) return;

		console.log(`🎯 AI hit: ${firstHit.name}`);
		this.hasHitThisRound = true;
		// audioManager.playCheer(0.5);

		const bodyPart = firstHit.userData.part || 'other';
		console.log(bodyPart);

		let ptsEarned = 0;
		if (bodyPart === 'head' || bodyPart === 'neck') {
			ptsEarned = 3;
			// audioManager.playHeadshot(0.3);
		} else if (
			bodyPart.includes('spine') ||
			bodyPart.includes('shoulder') ||
			bodyPart.includes('bone')
		) {
			ptsEarned = 2;
		} else {
			ptsEarned = 1;
			// audioManager.playOuch(0.3);
			// audioManager.playNeigh(0.4);
		}

		const hitData = {
			part_hit: bodyPart,
			pts_earned: ptsEarned,
			mph_on_contact: parseFloat(this.currentSpeed.toFixed(1)),
		};

		if (this.ownerEntity?.registerHit) {
			this.ownerEntity.registerHit(hitData);
		} else {
			const currentBout = gameStateManager.getBout();
			if (currentBout > 0) {
				gameStateManager.setBoutMetadata(currentBout, this.team, hitData);
			}
		}
	}

	reset() {
		// Call parent class reset method first
		super.reset();

		// Reset AI-specific targeting state
		this.timeSinceLastAimUpdate = 0;
		this.currentAimPoint = new THREE.Vector3();
		this.targetAimPoint = new THREE.Vector3();
		this.passedTarget = false;

		// Reset preview ray visualization elements
		if (this.previewRayLine) {
			this.previewRayLine.visible = gameStateManager.debug;

			// Reset geometry to default positions if needed
			const positions = this.previewRayLine.geometry.attributes.position.array;
			if (this.handRef) {
				const handPos = new THREE.Vector3();
				this.handRef.getWorldPosition(handPos);

				// Set both ends of the line to the hand position initially
				positions[0] = handPos.x;
				positions[1] = handPos.y;
				positions[2] = handPos.z;
				positions[3] = handPos.x;
				positions[4] = handPos.y;
				positions[5] = handPos.z;

				this.previewRayLine.geometry.attributes.position.needsUpdate = true;
			}
		}

		if (this.previewTipSphere) {
			this.previewTipSphere.visible = gameStateManager.debug;

			// Reset to hand position
			if (this.handRef) {
				const handPos = new THREE.Vector3();
				this.handRef.getWorldPosition(handPos);
				this.previewTipSphere.position.copy(handPos);
			}
		}

		// Reset model rotation if it exists
		if (this.model) {
			this.model.quaternion.identity();
		}

		// Reset arm rotation if it exists
		if (this.armRef) {
			// Reset to default rotation
			this.armRef.rotation.set(0, 0, 0);
		}

		// Clear all highlighted hitboxes
		this.highlightedHitboxes?.forEach((sphere) => {
			this.unhighlightSphere(sphere);
		});

		console.log('AI lance reset complete');
	}

	dispose() {
		// Clean up additional debug elements
		if (this.previewRayLine) {
			this.scene.remove(this.previewRayLine);
			this.previewRayLine.geometry.dispose();
			this.previewRayLine.material.dispose();
			this.previewRayLine = null;
		}

		if (this.previewTipSphere) {
			this.scene.remove(this.previewTipSphere);
			this.previewTipSphere.geometry.dispose();
			this.previewTipSphere.material.dispose();
			this.previewTipSphere = null;
		}

		// Call parent dispose method
		super.dispose();
	}
}
