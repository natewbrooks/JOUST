// core/objects/LanceEntity.js
import * as THREE from 'three';
import { ModelLoader } from '../../utils/ModelLoader';
import GameState from '../../game-state';
import audioManager from '../../utils/AudioManager';

export class LanceEntity {
	constructor(scene, cameraRef, handRef, armRef, ownerEntity = null) {
		this.scene = scene;
		this.cameraRef = cameraRef;
		this.handRef = handRef;
		this.armRef = armRef;
		this.ownerEntity = ownerEntity; // Reference to the owning PlayerEntity/OpponentEntity

		// Combat state - using consistent variable names
		this.hasHitThisRound = false;

		this.modelPath = '/models/lance/Lance.glb';
		this.model = null;

		this.mousePosRef = null;
		this.mouse = new THREE.Vector2();

		// Raycasting for hit detection
		this.rayLine = null;
		this.tipSphere = null;
		this.raycaster = new THREE.Raycaster();

		// Preview raycasting (longer range for highlighting)
		this.previewRayLine = null;
		this.previewRaycaster = new THREE.Raycaster();
		this.previewRayLength = 10; // Much longer range for preview

		// Mesh highlighting - track individual spheres
		this.highlightedHitboxes = new Set(); // Track only highlighted hitbox spheres
		this.originalMaterials = new Map();
		this.highlightMaterial = new THREE.MeshBasicMaterial({
			color: 0xffff00, // Yellow
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

		// Team identification - get from owner entity or default to red
		this.team = ownerEntity ? ownerEntity.team : 'red';

		// Initialize event listeners
		this.setupMouseListeners();

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
		});
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
			color: 0xff0000, // Red line
			linewidth: 2,
		});
		const points = [new THREE.Vector3(), new THREE.Vector3()];
		const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
		this.rayLine = new THREE.Line(lineGeometry, lineMaterial);
		this.rayLine.name = '[DEBUG] Lance Hit Ray';
		this.rayLine.visible = GameState.debug;
		this.scene.add(this.rayLine);

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
		this.previewRayLine.visible = GameState.debug;
		this.scene.add(this.previewRayLine);

		// Create tip sphere for hit detection visualization
		this.tipSphere = this.createDebugSphere(
			new THREE.Vector3(),
			0.1,
			0x00ff00,
			'[DEBUG] Tip Sphere'
		);
		this.scene.add(this.tipSphere);

		// Create preview tip sphere (end of preview ray)
		this.previewTipSphere = this.createDebugSphere(
			new THREE.Vector3(),
			0.15, // Slightly larger
			0x0000ff, // Blue color
			'[DEBUG] Preview Tip Sphere'
		);
		this.scene.add(this.previewTipSphere);

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

	customizeMaterials() {
		const baseMaterials = [
			new THREE.MeshStandardMaterial({ color: 0xff0000 }), // Red
			new THREE.MeshStandardMaterial({ color: 0x0000ff }), // Blue
			new THREE.MeshStandardMaterial({ color: 0x800080 }), // Purple
			new THREE.MeshStandardMaterial({ color: 0xffa500 }), // Orange
			new THREE.MeshStandardMaterial({ color: 0x00ff00 }), // Green
			new THREE.MeshStandardMaterial({ color: 0x000000 }), // Black
			new THREE.MeshStandardMaterial({ color: 0xffffff }), // White
			new THREE.MeshStandardMaterial({ color: 0x3b2f2f }), // DarkWood (brown)
			new THREE.MeshStandardMaterial({ color: 0xdeb887 }), // Wood
		];

		const getRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

		this.model.traverse((child) => {
			if (!child.isMesh) return;

			if (child.name.includes('Base')) {
				child.material = getRandom(baseMaterials);
			} else if (child.name.includes('Spiral')) {
				child.material = getRandom(baseMaterials);
			} else if (child.name.includes('Hilt')) {
				child.material = getRandom(baseMaterials);
			}
		});
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

		this.model.traverse((child) => {
			if (!child.isMesh) return;

			if (child.name.includes('Base')) {
				child.material = material;
			}
		});
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

		// console.log('🟡 Highlighted hitbox sphere:', sphere.name || 'unnamed sphere');
	}

	unhighlightSphere(sphere) {
		// Remove from highlighted set
		this.highlightedHitboxes.delete(sphere);

		// Restore original material
		if (this.originalMaterials.has(sphere)) {
			sphere.material = this.originalMaterials.get(sphere);
			sphere.visible = false;
			this.originalMaterials.delete(sphere);
		}

		// console.log('⚪ Unhighlighted hitbox sphere:', sphere.name || 'unnamed sphere');
	}

	clearAllHighlights() {
		this.highlightedHitboxes.forEach((sphere) => {
			this.unhighlightSphere(sphere);
		});
	}

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

		if (this.previewRayLine) {
			this.previewRayLine.visible = GameState.debug;
		}

		if (this.tipSphere) {
			this.tipSphere.visible = GameState.debug;
		}

		if (this.previewTipSphere) {
			this.previewTipSphere.visible = GameState.debug;
		}

		// Skip if critical components aren't ready
		if (!this.model || !this.cameraRef || !this.raycaster || !this.handRef) return;

		// Only handle mouse aiming if we have a mouse position
		if (this.mousePosRef) {
			// Use hand world position as raycaster origin
			const offset = new THREE.Vector3(0, 0.25, 0);
			const handWorldPos = this.lastPositionRef
				.clone()
				.add(
					offset.clone().applyQuaternion(this.handRef.getWorldQuaternion(new THREE.Quaternion()))
				);

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
			this.model.quaternion.copy(localQuaternion);

			// Calculate ray end point for hit detection (short range)
			const hitRayLength = 2.5;
			const hitRayEnd = handWorldPos.clone().add(rayDirection.clone().multiplyScalar(hitRayLength));
			this.raycaster.far = hitRayLength;

			// Calculate ray end point for preview (long range)
			const previewRayEnd = handWorldPos
				.clone()
				.add(rayDirection.clone().multiplyScalar(this.previewRayLength));
			this.previewRaycaster.far = this.previewRayLength;

			// Update tip spheres
			if (this.tipSphere) {
				this.tipSphere.position.copy(hitRayEnd);
			}

			if (this.previewTipSphere) {
				this.previewTipSphere.position.copy(previewRayEnd);
			}

			// Update debug ray lines - IMPORTANT: Update both lines
			if (this.rayLine && GameState.debug) {
				const positions = this.rayLine.geometry.attributes.position.array;
				positions[0] = handWorldPos.x;
				positions[1] = handWorldPos.y;
				positions[2] = handWorldPos.z;
				positions[3] = hitRayEnd.x;
				positions[4] = hitRayEnd.y;
				positions[5] = hitRayEnd.z;
				this.rayLine.geometry.attributes.position.needsUpdate = true;
			}

			if (this.previewRayLine && GameState.debug) {
				const positions = this.previewRayLine.geometry.attributes.position.array;
				positions[0] = handWorldPos.x;
				positions[1] = handWorldPos.y;
				positions[2] = handWorldPos.z;
				positions[3] = previewRayEnd.x;
				positions[4] = previewRayEnd.y;
				positions[5] = previewRayEnd.z;
				this.previewRayLine.geometry.attributes.position.needsUpdate = true;
			}

			// // Find potential target objects
			const potentialTargets = [];
			// // Find opponent team type
			const opponentTeam = this.team === 'red' ? 'blue' : 'red';

			this.scene.traverse((object) => {
				// Check for opponent objects and their children
				if (
					object.userData?.type === opponentTeam ||
					object.name.toLowerCase().includes('hitbox')
				) {
					potentialTargets.push(object);
				}

				// Check for opponent bones
				// if (object.type === 'Mesh' && object.name.toLowerCase().includes('hitbox')) {
				// 	// Look up the parent tree for opponent entity
				// 	let currentParent = object.parent;
				// 	while (currentParent) {
				// 		if (currentParent.userData?.type === opponentTeam) {
				// 			potentialTargets.push(object);
				// 			break;
				// 		}
				// 		currentParent = currentParent.parent;
				// 	}
				// }
			});

			// Create ignore list (don't hit own parts)
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

			// Check preview intersections (long range) for highlighting
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

			// Check actual hit detection (short range) only if game is in motion and cooldown is over
			if (GameState.can_move && !this.hasHitThisRound) {
				const intersects = this.raycaster
					.intersectObjects(potentialTargets, true)
					.filter((hit) => !ignored.has(hit.object.uuid));

				// Process actual hits
				if (intersects.length > 0) {
					const firstHit = intersects[0].object;

					if (!firstHit.name.toLowerCase().includes('hitbox')) return;
					console.log('✅ Hit opponent:', firstHit.name);
					console.log(firstHit);
					audioManager.playCheer(0.5);
					this.hasHitThisRound = true;

					// Determine body part hit
					let bodyPart = 'other'; // Default to other for 1 point
					if (firstHit.userData?.part) {
						bodyPart = firstHit.userData.part;
					} else if (firstHit.type === 'Mesh') {
						const boneName = firstHit.name.toLowerCase();
						console.log(boneName);

						// Check for headshot parts: Head and Neck = 3 points
						if (boneName.includes('head') || boneName.includes('neck')) {
							bodyPart = 'head';
						}
						// Check for body shot parts: Spine and Shoulder = 2 points
						else if (boneName.includes('spine') || boneName.includes('shoulder')) {
							bodyPart = 'body';
						}
						// Everything else = 1 point (other)
						else {
							bodyPart = 'other';
						}
					}

					// Calculate points based on body part
					let ptsEarned = 0;
					switch (bodyPart) {
						case 'head':
							ptsEarned = 3;
							console.log('💥 HEADSHOT! (+3 points)');
							audioManager.playHeadshot(0.3);
							break;
						case 'body':
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
							console.log(`📊 Bout ${currentBout} metadata logged for ${this.team} team`);
						}
					}

					// Set flags to prevent multiple hits
					this.hasHitThisRound = true;
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

		// Remove event listeners
		if (this.removeMouseListener) {
			this.removeMouseListener();
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

		if (this.previewRayLine) {
			this.scene.remove(this.previewRayLine);
			this.previewRayLine.geometry.dispose();
			this.previewRayLine.material.dispose();
			this.previewRayLine = null;
		}

		if (this.tipSphere) {
			this.scene.remove(this.tipSphere);
			this.tipSphere.geometry.dispose();
			this.tipSphere.material.dispose();
			this.tipSphere = null;
		}

		if (this.previewTipSphere) {
			this.scene.remove(this.previewTipSphere);
			this.previewTipSphere.geometry.dispose();
			this.previewTipSphere.material.dispose();
			this.previewTipSphere = null;
		}

		// Clear stored materials
		this.originalMaterials.clear();
	}
}
