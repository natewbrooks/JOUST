import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { getCameraForwardPlane } from '../../../utils/cameraTransitions';
import GameState from '../../../game-state.js';
import { useAnimator } from '../../../hooks/useAnimator.jsx';

export default function Lance({ scene, cameraRef, playerRef, position }) {
	const modelPath = '/models/lance/Lance.glb';

	// Local storage of the current animation playing
	// const [currentAnimation, setCurrentAnimation] = useState('');
	// Names of animations embedded in the models .glb
	// const [animationNames, setAnimationNames] = useState([]);
	const baseSphereRef = useRef(null);
	const tipSphereRef = useRef(null);
	const coneMeshRef = useRef(null);

	const hasHitThisRound = useRef(false);
	const mousePosRef = useRef(null);

	const planeRef = useRef(null);
	const rayLineRef = useRef(null);
	const raycaster = new THREE.Raycaster();
	const mouse = new THREE.Vector2();

	// Use a ref for the aim vector instead of recreating it every frame
	const aimVectorRef = useRef(new THREE.Vector3(0, 0, -1));

	// Create the model and animator instance
	const { model, animations, playAnimation, setMaterial, material } = useAnimator(
		'Red Lance',
		modelPath,
		scene
	);

	// Init the debug spheres
	useEffect(() => {
		if (!baseSphereRef.current || !tipSphereRef.current) {
			let geometry = new THREE.SphereGeometry(0.2, 4, 4);
			let material = new THREE.MeshBasicMaterial({ color: 0x50a05a });
			baseSphereRef.current = new THREE.Mesh(geometry, material);
			baseSphereRef.current.name = '[LANCE] Base sphere';
			scene.add(baseSphereRef.current);

			geometry = new THREE.SphereGeometry(0.2, 4, 4);
			material = new THREE.MeshBasicMaterial({ color: 0x883ead });
			tipSphereRef.current = new THREE.Mesh(geometry, material);
			tipSphereRef.current.name = '[LANCE] Tip sphere';
			scene.add(tipSphereRef.current);

			// Line only if debug mode ON
			if (GameState.debug) {
				const lineMaterial = new THREE.LineBasicMaterial({ color: 0xffff00 });
				const points = [new THREE.Vector3(), new THREE.Vector3()];
				const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
				rayLineRef.current = new THREE.Line(lineGeometry, lineMaterial);
				rayLineRef.current.name = '[DEBUG] Ray Line';
				scene.add(rayLineRef.current);
			}
		}
	}, []);

	// Toggle sphere visibility dynamically based on GameState.debug
	useEffect(() => {
		if (baseSphereRef.current) baseSphereRef.current.visible = GameState.debug;
		if (tipSphereRef.current) tipSphereRef.current.visible = GameState.debug;
		if (rayLineRef.current) rayLineRef.current.visible = GameState.debug;
	}, [GameState.debug]);

	// Init mouse move listener
	useEffect(() => {
		if (!baseSphereRef || !tipSphereRef.current) return;

		const onMouseMove = (event) => {
			const w = window.innerWidth;
			const h = window.innerHeight;

			// Normalize mouse X/Y to full screen space (-1 to 1)
			mouse.x = (event.clientX / w) * 2 - 1;
			mouse.y = -(event.clientY / h) * 2 + 1;

			mousePosRef.current = new THREE.Vector2(mouse.x, mouse.y);
			// console.log(mouse);
		};

		window.addEventListener('mousemove', onMouseMove);
		return () => window.removeEventListener('mousemove', onMouseMove);
	}, []);

	useEffect(() => {
		if (!model || !cameraRef.current || !mousePosRef.current) return;

		const offset = new THREE.Vector3(0, 0.5, 0); // Small height offset
		model.position.set(position.x, position.y - offset.y, position.z);

		// Map mouse screen pos (-1 to 1) into a 3D world direction

		// Create a raycaster based on mousePosRef
		const tempRaycaster = new THREE.Raycaster();
		tempRaycaster.setFromCamera(mousePosRef.current, cameraRef.current);

		// Use the ray's direction as where the mouse points
		const mouseDirection = tempRaycaster.ray.direction.clone().normalize();

		// Create a quaternion from model forward (+Z) to mouse direction
		const forwardVector = new THREE.Vector3(0, 0, 1); // Assuming model points +Z originally
		const targetQuaternion = new THREE.Quaternion().setFromUnitVectors(
			forwardVector,
			mouseDirection
		);

		// Set model rotation
		model.quaternion.copy(targetQuaternion);
	}, [position, model, cameraRef, mousePosRef.current]);

	// Continuous update
	useEffect(() => {
		const update = () => {
			requestAnimationFrame(update);

			if (
				!playerRef.current ||
				!cameraRef.current ||
				!baseSphereRef.current ||
				!tipSphereRef.current
			)
				return;

			const playerPos = playerRef.current.position.clone();

			planeRef.current = getCameraForwardPlane(cameraRef.current, 50);

			raycaster.setFromCamera(mouse, cameraRef.current);
			const intersection = new THREE.Vector3();

			if (raycaster.ray.intersectPlane(planeRef.current, intersection)) {
				// Update the aimVectorRef instead of creating a new vector
				aimVectorRef.current.subVectors(intersection, playerPos).normalize();

				// Compute positions
				const offset = new THREE.Vector3(0, 0.5, 0); // Height offset
				const basePos = playerPos.clone().sub(offset);

				// Use the actual mouse intersection point for tip position
				// This directly follows the mouse cursor
				const lanceLength = 3.5;
				const tipPos = basePos
					.clone()
					.add(aimVectorRef.current.clone().multiplyScalar(lanceLength));

				// Update debug spheres
				baseSphereRef.current.position.copy(basePos);
				tipSphereRef.current.position.copy(tipPos);

				// Update debug ray line
				if (GameState.debug && rayLineRef.current) {
					const rayStart = basePos.clone();
					const rayEnd = tipPos.clone();
					const positions = rayLineRef.current.geometry.attributes.position.array;
					positions[0] = rayStart.x;
					positions[1] = rayStart.y;
					positions[2] = rayStart.z;
					positions[3] = rayEnd.x;
					positions[4] = rayEnd.y;
					positions[5] = rayEnd.z;
					rayLineRef.current.geometry.attributes.position.needsUpdate = true;
				}

				// Collision check
				const lanceDirection = new THREE.Vector3().subVectors(tipPos, basePos).normalize();
				raycaster.set(basePos, lanceDirection);

				const ignored = new Set([
					baseSphereRef.current.uuid,
					tipSphereRef.current.uuid,
					playerRef.current.uuid,
					model?.uuid,
					rayLineRef.current?.uuid,
				]);

				if (model) {
					model.traverse((child) => {
						ignored.add(child.uuid);
					});
				}

				const intersects = raycaster.intersectObjects(scene.children, true).filter((hit) => {
					const obj = hit.object;

					// Only accept if tagged as opponent
					return obj.userData?.type === 'opponent';
				});

				if (intersects.length > 0 && !hasHitThisRound.current) {
					const firstHit = intersects[0].object;

					console.log('✅ Hit opponent:', firstHit.name);

					hasHitThisRound.current = true; // Mark that we've already hit this round

					// Optional: headshot check
					if (firstHit.userData.part === 'head') {
						console.log('💥 HEADSHOT!');
					}
				}
			}
		};

		update();
	}, [cameraRef, playerRef, model]);

	return <></>;
}
