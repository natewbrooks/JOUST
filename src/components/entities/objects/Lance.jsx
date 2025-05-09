import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { getCameraForwardPlane } from '../../../utils/cameraTransitions';
import GameState from '../../../game-state.js';
import { useAnimator } from '../../../hooks/useAnimator.jsx';

export default function Lance({ scene, cameraRef, position, handRef }) {
	const modelPath = '/models/lance/Lance.glb';

	const hasHitThisRound = useRef(false);
	const mousePosRef = useRef(null);
	const mouse = new THREE.Vector2();

	const rayLineRef = useRef(null);
	const tipSphereRef = useRef(null);
	const raycaster = useRef(new THREE.Raycaster());

	// Flag to track if we're already running the update loop
	const isUpdating = useRef(false);

	// Create debug sphere once and reuse it
	function createDebugSphere(
		position,
		radius = 0.1,
		color = 0xff0000,
		name = '[DEBUG] Custom Sphere'
	) {
		const geometry = new THREE.SphereGeometry(radius, 16, 16);
		const material = new THREE.MeshBasicMaterial({ color });
		const sphere = new THREE.Mesh(geometry, material);
		sphere.position.copy(position);
		sphere.name = name;
		sphere.visible = GameState.debug;
		return sphere;
	}

	// Create the model and animator instance
	const { model, animations, playAnimation, setMaterial, material } = useAnimator(
		'Red Lance',
		modelPath,
		scene,
		() => {
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

			scene.traverse((child) => {
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
	);

	// Initialize debug elements once
	useEffect(() => {
		// Create debug line
		if (!rayLineRef.current) {
			const lineMaterial = new THREE.LineBasicMaterial({ color: 0xff0000 }); // Red line
			const points = [new THREE.Vector3(), new THREE.Vector3()];
			const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
			rayLineRef.current = new THREE.Line(lineGeometry, lineMaterial);
			rayLineRef.current.name = '[DEBUG] Lance Ray Line';
			rayLineRef.current.visible = GameState.debug;
			scene.add(rayLineRef.current);
		}

		// Create tip sphere once
		if (!tipSphereRef.current) {
			tipSphereRef.current = createDebugSphere(
				new THREE.Vector3(),
				0.1,
				0x00ff00,
				'[DEBUG] Tip Sphere'
			);
			scene.add(tipSphereRef.current);
		}
	}, []);

	// Toggle debug visibility when GameState.debug changes
	useEffect(() => {
		if (rayLineRef.current) rayLineRef.current.visible = GameState.debug;
		if (tipSphereRef.current) tipSphereRef.current.visible = GameState.debug;
	}, [GameState.debug]);

	// Init mouse move listener
	useEffect(() => {
		const onMouseMove = (event) => {
			const w = window.innerWidth;
			const h = window.innerHeight;

			// Normalize mouse X/Y to full screen space (-1 to 1)
			mouse.x = (event.clientX / w) * 2 - 1;
			mouse.y = -(event.clientY / h) * 2 + 1;

			mousePosRef.current = new THREE.Vector2(mouse.x, mouse.y);
		};

		window.addEventListener('mousemove', onMouseMove);
		return () => window.removeEventListener('mousemove', onMouseMove);
	}, []);

	// Continuous animation loop to update lance position and check collisions
	useEffect(() => {
		// Prevent multiple animation loops
		if (isUpdating.current) return;
		isUpdating.current = true;

		const update = () => {
			// Continue the animation loop
			requestAnimationFrame(update);

			// Skip if not ready
			if (!model || !cameraRef.current || !raycaster.current) return;

			// Use either the passed position or directly get from handRef
			let handWorldPos = new THREE.Vector3();

			// Try to use handRef directly first
			if (handRef && handRef.current) {
				handRef.current.getWorldPosition(handWorldPos);
				// Add offset for better positioning
				handWorldPos.add(new THREE.Vector3(0.2, 0.1, 0));
			}
			// Fallback to passed position
			else if (position && position.x !== undefined) {
				handWorldPos.copy(position);
			}
			// If neither is available, skip this frame
			else {
				return;
			}

			// Set lance model position
			model.position.copy(handWorldPos);

			// Only handle mouse aiming if we have a mouse position
			if (mousePosRef.current) {
				// Create raycaster from hand through mouse point
				const mouseNDC = mousePosRef.current.clone();
				raycaster.current.setFromCamera(mouseNDC, cameraRef.current);

				// Move ray origin to hand position but keep direction
				const rayDirection = raycaster.current.ray.direction.clone().normalize();
				raycaster.current.set(handWorldPos, rayDirection);

				// Aim the model
				const forwardVector = new THREE.Vector3(0, 0, 1);
				const targetQuaternion = new THREE.Quaternion().setFromUnitVectors(
					forwardVector,
					rayDirection
				);
				model.quaternion.copy(targetQuaternion);

				// Calculate ray end point
				const rayLength = 2.5;
				const rayEnd = handWorldPos.clone().add(rayDirection.clone().multiplyScalar(rayLength));
				raycaster.current.far = rayLength;

				// Update tip sphere
				if (tipSphereRef.current) {
					tipSphereRef.current.position.copy(rayEnd);
				}

				// Update debug ray line
				if (rayLineRef.current) {
					const positions = rayLineRef.current.geometry.attributes.position.array;
					positions[0] = handWorldPos.x;
					positions[1] = handWorldPos.y;
					positions[2] = handWorldPos.z;
					positions[3] = rayEnd.x;
					positions[4] = rayEnd.y;
					positions[5] = rayEnd.z;
					rayLineRef.current.geometry.attributes.position.needsUpdate = true;
				}

				// Check for collisions
				const potentialTargets = [];
				scene.traverse((object) => {
					if (
						object.userData?.type === 'opponent' ||
						(object.parent && object.parent.userData?.type === 'opponent')
					) {
						potentialTargets.push(object);
					}

					if (
						object.type === 'Bone' &&
						object.parent &&
						(object.parent.userData?.type === 'opponent' ||
							(object.parent.parent && object.parent.parent.userData?.type === 'opponent'))
					) {
						potentialTargets.push(object);
					}
				});

				// Create ignore list
				const ignored = new Set();
				if (model) {
					model.traverse((child) => {
						ignored.add(child.uuid);
					});
				}
				if (rayLineRef.current) ignored.add(rayLineRef.current.uuid);
				if (tipSphereRef.current) ignored.add(tipSphereRef.current.uuid);

				// Check intersections
				const intersects = raycaster.current
					.intersectObjects(potentialTargets, true)
					.filter((hit) => !ignored.has(hit.object.uuid));

				// Process hits
				if (intersects.length > 0 && !hasHitThisRound.current) {
					const firstHit = intersects[0].object;
					console.log('✅ Hit opponent:', firstHit.name);

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

					console.log(`🎯 Hit on ${bodyPart}!`);
					if (bodyPart === 'head') {
						console.log('💥 HEADSHOT!');
					}

					hasHitThisRound.current = true;
				}
			}
		};

		// Start the update loop
		requestAnimationFrame(update);

		// Cleanup
		return () => {
			isUpdating.current = false;
		};
	}, [model, cameraRef, handRef]); // Minimal dependencies to avoid restarting the loop

	return <></>;
}
