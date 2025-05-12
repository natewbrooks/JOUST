// core/objects/AILanceEntity.js
import * as THREE from 'three';
import { LanceEntity } from './LanceEntity';
import GameState from '../../game-state';

export class AILanceEntity extends LanceEntity {
	constructor(scene, handRef, armRef, ownerEntity, targetEntity) {
		// Call base constructor (no camera needed for AI)
		super(scene, handRef, armRef, ownerEntity);

		// Store reference to the target entity (usually the player)
		this.targetEntity = targetEntity;

		// AI aiming properties
		this.aimVariance = 0.0; // Increased randomness for more misses
		this.aimUpdateInterval = 1;
		this.timeSinceLastAimUpdate = 0;
		this.currentAimPoint = new THREE.Vector3();
		this.targetAimPoint = new THREE.Vector3();
		this.aimSmoothingFactor = 0.05; // Lower = smoother but slower (0-1)

		// Targeting behavior
		this.missChance = 0.0; // 33% chance to miss
		this.forwardBias = 0.5; // How much to favor forward direction

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
		this.previewRayLine.visible = GameState.debug;
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
		const rayDirection = new THREE.Vector3()
			.subVectors(this.currentAimPoint, handWorldPos)
			.normalize();

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
		if (GameState.debug) {
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

		// Determine if player is in front of the knight
		const dotProduct = toPlayer.dot(knightForward);
		const playerInFront = dotProduct > 0;

		// Decide whether to miss
		const shouldMiss = Math.random() < 0.4; // 40% chance to miss

		// Set target position
		const targetPosition = new THREE.Vector3();

		if (playerInFront && !shouldMiss) {
			// Try to hit the player
			let hitTarget = null;

			// Get hitboxes from the target entity if the method exists
			if (this.targetEntity.getHitboxes) {
				// Get all hitboxes
				const allHitboxes = this.targetEntity.getHitboxes();

				// If we have hitboxes, decide what to target
				if (allHitboxes.length > 0) {
					// 60% chance to aim for the head if available
					const headHitboxes = this.targetEntity.getHitboxes('head');
					const bodyHitboxes = this.targetEntity.getHitboxes('body');

					// Weighted random selection:
					// - 60% chance for head if available
					// - 30% chance for body if available
					// - 10% chance for any hitbox
					const rnd = Math.random();
					if (rnd < 0.6 && headHitboxes.length > 0) {
						// Target a random head hitbox
						hitTarget = headHitboxes[Math.floor(Math.random() * headHitboxes.length)];
					} else if (rnd < 0.9 && bodyHitboxes.length > 0) {
						// Target a random body hitbox
						hitTarget = bodyHitboxes[Math.floor(Math.random() * bodyHitboxes.length)];
					} else if (allHitboxes.length > 0) {
						// Target any random hitbox
						hitTarget = allHitboxes[Math.floor(Math.random() * allHitboxes.length)];
					}

					if (hitTarget) {
						// Get the world position of the selected hitbox
						hitTarget.getWorldPosition(targetPosition);
						console.log(`AI targeting: ${hitTarget.name}`);
					}
				}
			}

			// If no hitbox was selected, fallback to targeting the player model
			if (!hitTarget) {
				targetPosition.copy(playerPosition);
				// Aim at upper body height
				targetPosition.y += 0.5;
			}

			// Add small variance to aiming (natural inaccuracy)
			const minVariance = 0.1; // Minimum variance for natural inaccuracy
			targetPosition.x += (Math.random() * 2 - 1) * Math.max(minVariance, this.aimVariance * 0.3);
			targetPosition.y += (Math.random() * 2 - 1) * Math.max(minVariance, this.aimVariance * 0.3);
			targetPosition.z += (Math.random() * 2 - 1) * Math.max(minVariance, this.aimVariance * 0.3);
		} else {
			// Either deliberately missing or player is behind

			// Create a point far forward in the knight's direction
			targetPosition.copy(knightPosition).add(knightForward.clone().multiplyScalar(20));

			if (shouldMiss && playerInFront) {
				// If deliberately missing but player is in front,
				// aim in their general direction but with large variance
				const missOffset = new THREE.Vector3(
					(Math.random() * 2 - 1) * this.aimVariance * 2,
					(Math.random() * 2 - 1) * this.aimVariance * 2,
					(Math.random() * 2 - 1) * this.aimVariance * 2
				);

				targetPosition.copy(playerPosition).add(missOffset);
			} else {
				// Just point forward with some random variance
				targetPosition.y += (Math.random() * 2 - 1) * 0.5;
				targetPosition.z += (Math.random() * 2 - 1) * 0.5;
			}
		}

		// Store as target aim point for smooth interpolation
		this.targetAimPoint.copy(targetPosition);

		// Initialize current aim point if it's the first time
		if (this.currentAimPoint.lengthSq() === 0) {
			this.currentAimPoint.copy(this.targetAimPoint);
		}
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
