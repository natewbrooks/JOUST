// core/objects/LanceEntity.js
import * as THREE from 'three';
import { ModelLoader } from '../../utils/ModelLoader';
import GameState from '../../game-state';

export class LanceEntity {
	constructor(scene, cameraRef, handRef, armRef) {
		this.scene = scene;
		this.cameraRef = cameraRef;
		this.handRef = handRef;

		this.modelPath = '/models/lance/Lance.glb';
		this.model = null;

		this.hasHitThisRound = false;
		this.mousePosRef = null;
		this.mouse = new THREE.Vector2();

		// Raycasting
		this.rayLine = null;
		this.tipSphere = null;
		this.raycaster = new THREE.Raycaster();

		// Flag for the update loop
		this.isUpdating = false;
		this.lastPositionRef = new THREE.Vector3();

		// Speed tracking for MPH calculation
		this.previousPosition = new THREE.Vector3();
		this.currentSpeed = 0;

		// Team identification - assuming this is the red team lance based on the path
		this.team = 'red';

		// Initialize event listeners
		this.setupMouseListeners();

		// Initialize the model
		this.modelLoader = new ModelLoader('Red Lance', this.modelPath);
		this.modelLoader.load((loadedModel) => {
			this.model = loadedModel;

			// Add the model to the hand
			this.handRef.add(this.model);
			this.model.position.set(0, 0.25, 0);

			// Customize materials
			this.customizeMaterials();

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
		// Create debug line for ray
		const lineMaterial = new THREE.LineBasicMaterial({ color: 0xff0000 }); // Red line
		const points = [new THREE.Vector3(), new THREE.Vector3()];
		const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
		this.rayLine = new THREE.Line(lineGeometry, lineMaterial);
		this.rayLine.name = '[DEBUG] Lance Ray Line';
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

			// Create raycaster from hand through mouse point
			const mouseNDC = this.mousePosRef.clone();
			this.raycaster.setFromCamera(mouseNDC, this.cameraRef);

			// Move ray origin to hand position but keep direction
			const rayDirection = this.raycaster.ray.direction.clone().normalize();
			this.raycaster.set(handWorldPos, rayDirection);

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

			// Calculate ray end point in world space
			const rayLength = 2.5;
			const rayEnd = handWorldPos.clone().add(rayDirection.clone().multiplyScalar(rayLength));
			this.raycaster.far = rayLength;

			// Update tip sphere
			if (this.tipSphere) {
				this.tipSphere.position.copy(rayEnd);
			}

			// Update debug ray line
			if (this.rayLine) {
				const positions = this.rayLine.geometry.attributes.position.array;
				positions[0] = handWorldPos.x;
				positions[1] = handWorldPos.y;
				positions[2] = handWorldPos.z;
				positions[3] = rayEnd.x;
				positions[4] = rayEnd.y;
				positions[5] = rayEnd.z;
				this.rayLine.geometry.attributes.position.needsUpdate = true;
			}

			// Check for collisions if the game is in motion
			if (GameState.can_move) {
				// Find potential target objects
				const potentialTargets = [];
				this.scene.traverse((object) => {
					// Check for opponent objects
					if (
						object.userData?.type === 'opponent' ||
						(object.parent && object.parent.userData?.type === 'opponent')
					) {
						potentialTargets.push(object);
					}

					// Check for opponent bones
					if (
						object.type === 'Bone' &&
						object.parent &&
						(object.parent.userData?.type === 'opponent' ||
							(object.parent.parent && object.parent.parent.userData?.type === 'opponent'))
					) {
						potentialTargets.push(object);
					}
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
				if (this.tipSphere) ignored.add(this.tipSphere.uuid);

				// Check intersections
				const intersects = this.raycaster
					.intersectObjects(potentialTargets, true)
					.filter((hit) => !ignored.has(hit.object.uuid));

				// Process hits
				if (intersects.length > 0 && !this.hasHitThisRound) {
					const firstHit = intersects[0].object;
					console.log('✅ Hit opponent:', firstHit.name);

					// Determine body part hit
					let bodyPart = 'body';
					if (firstHit.userData?.part) {
						bodyPart = firstHit.userData.part;
					} else if (firstHit.type === 'Bone') {
						const boneName = firstHit.name.toLowerCase();
						if (
							boneName.includes('head') ||
							boneName.includes('skull') ||
							boneName.includes('neck')
						) {
							bodyPart = 'head';
						} else if (
							boneName.includes('arm') ||
							boneName.includes('hand') ||
							boneName.includes('shoulder')
						) {
							bodyPart = 'arm';
						} else if (
							boneName.includes('leg') ||
							boneName.includes('foot') ||
							boneName.includes('ankle')
						) {
							bodyPart = 'leg';
						} else if (
							boneName.includes('spine') ||
							boneName.includes('chest') ||
							boneName.includes('torso')
						) {
							bodyPart = 'torso';
						}
					}

					// Calculate points based on body part
					let ptsEarned = 0;
					switch (bodyPart) {
						case 'head':
							ptsEarned = 3;
							console.log('💥 HEADSHOT! (+3 points)');
							break;
						case 'torso':
						case 'body':
							ptsEarned = 2;
							console.log('🎯 Body hit! (+2 points)');
							break;
						case 'arm':
						case 'leg':
							ptsEarned = 1;
							console.log('🎯 Limb hit! (+1 point)');
							break;
						default:
							ptsEarned = 2; // Default to body hit
							console.log('🎯 Hit! (+2 points)');
							break;
					}

					console.log(`🎯 Hit on ${bodyPart}! (${this.currentSpeed.toFixed(1)} MPH)`);

					// Log metadata to GameState
					const currentBout = GameState.getBout();
					if (currentBout > 0) {
						GameState.setBoutMetadata(currentBout, this.team, {
							part_hit: bodyPart,
							pts_earned: ptsEarned,
							mph_on_contact: parseFloat(this.currentSpeed.toFixed(1)),
						});

						console.log(`📊 Bout ${currentBout} metadata logged for ${this.team} team`);
					}

					this.hasHitThisRound = true;
				}
			}
		}
	}

	dispose() {
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

		if (this.tipSphere) {
			this.scene.remove(this.tipSphere);
			this.tipSphere.geometry.dispose();
			this.tipSphere.material.dispose();
			this.tipSphere = null;
		}

		// ModelLoader doesn't need dispose method as it doesn't have animation-related resources
	}
}
