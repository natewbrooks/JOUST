// core/objects/PlayerLanceEntity.js
import * as THREE from 'three';
import { LanceEntity } from './LanceEntity';
import gameStateManager from '../../GameStateManager';

export class PlayerLanceEntity extends LanceEntity {
	constructor(scene, cameraRef, handRef, armRef, ownerEntity = null) {
		super(scene, handRef, armRef, ownerEntity);

		this.cameraRef = cameraRef;
		this.mousePosRef = null;
		this.mouse = new THREE.Vector2();

		// Preview raycasting (longer range for highlighting)
		this.previewRayLine = null;
		this.previewRaycaster = new THREE.Raycaster();
		this.previewRayLength = 10; // Much longer range for preview
		this.previewTipSphere = null;

		// Initialize mouse event listeners
		this.setupMouseListeners();
	}

	onModelLoaded() {
		// Create additional debug elements for player lance
		this.createPlayerDebugElements();
	}

	createPlayerDebugElements() {
		// Create debug line for preview ray (long range - GREEN)
		const previewLineMaterial = new THREE.LineBasicMaterial({
			color: 0x00ff00, // Green line
			transparent: true,
			opacity: 0.7,
			linewidth: 3,
		});
		const previewPoints = [new THREE.Vector3(), new THREE.Vector3()];
		const previewLineGeometry = new THREE.BufferGeometry().setFromPoints(previewPoints);
		this.previewRayLine = new THREE.Line(previewLineGeometry, previewLineMaterial);
		this.previewRayLine.name = '[DEBUG] Lance Preview Ray';
		this.previewRayLine.visible = gameStateManager.debug;
		this.scene.add(this.previewRayLine);

		// Create preview tip sphere (end of preview ray)
		this.previewTipSphere = this.createDebugSphere(
			new THREE.Vector3(),
			0.15, // Slightly larger
			0x0000ff, // Blue color
			'[DEBUG] Preview Tip Sphere'
		);
		this.scene.add(this.previewTipSphere);
	}

	setupMouseListeners() {
		const onMouseMove = (event) => {
			const w = window.innerWidth;
			const h = window.innerHeight;

			// Normalize mouse coordinates (-1 to 1)
			this.mouse.x = (event.clientX / w) * 2 - 1;
			this.mouse.y = -(event.clientY / h) * 2 + 1;

			this.mousePosRef = new THREE.Vector2(this.mouse.x, this.mouse.y);
		};

		window.addEventListener('mousemove', onMouseMove);

		// Store the remove function for cleanup
		this.removeMouseListener = () => {
			window.removeEventListener('mousemove', onMouseMove);
		};
	}

	updateAiming(deltaTime) {
		// Skip if we don't have the mouse position or camera
		if (!this.mousePosRef || !this.cameraRef) return;

		// Use hand world position as raycaster origin
		const offset = new THREE.Vector3(0, 0.25, 0);
		const handWorldPos = this.lastPositionRef
			.clone()
			.add(offset.clone().applyQuaternion(this.handRef.getWorldQuaternion(new THREE.Quaternion())));

		// Create ray direction from hand through mouse point
		const mouseNDC = this.mousePosRef.clone();
		this.raycaster.setFromCamera(mouseNDC, this.cameraRef);
		this.previewRaycaster.setFromCamera(mouseNDC, this.cameraRef);

		// Move ray origin to hand position but keep direction
		const rayDirection = this.raycaster.ray.direction.clone().normalize();

		// Set up both raycasters
		this.raycaster.set(handWorldPos, rayDirection);
		this.previewRaycaster.set(handWorldPos, rayDirection);

		// Aim the model (reset to identity first to avoid accumulated rotations)
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

		// Apply the rotation to the model
		if (this.model) {
			this.model.quaternion.copy(localQuaternion);
		}

		// Update preview ray visualization
		if (this.previewRayLine && gameStateManager.debug) {
			const previewRayEnd = handWorldPos
				.clone()
				.add(rayDirection.clone().multiplyScalar(this.previewRayLength));

			const positions = this.previewRayLine.geometry.attributes.position.array;
			positions[0] = handWorldPos.x;
			positions[1] = handWorldPos.y;
			positions[2] = handWorldPos.z;
			positions[3] = previewRayEnd.x;
			positions[4] = previewRayEnd.y;
			positions[5] = previewRayEnd.z;
			this.previewRayLine.geometry.attributes.position.needsUpdate = true;

			// Update preview tip sphere
			if (this.previewTipSphere) {
				this.previewTipSphere.position.copy(previewRayEnd);
			}
		}

		// Preview hitbox highlighting
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

		// Create ignore list (don't highlight own parts)
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

	reset() {
		// Call parent class reset method first
		super.reset();

		// Reset mouse-related properties
		this.mouse = new THREE.Vector2();

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

		// Clear all highlighted hitboxes
		this.highlightedHitboxes?.forEach((sphere) => {
			this.unhighlightSphere(sphere);
		});

		console.log('Player lance reset complete');
	}

	dispose() {
		// Remove player-specific event listeners
		if (this.removeMouseListener) {
			this.removeMouseListener();
		}

		// Remove player-specific debug elements
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

		// Call the parent class dispose method
		super.dispose();
	}
}
