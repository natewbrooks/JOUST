import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { getCameraForwardPlane } from '../../../utils/cameraTransitions';
import GameState from '../../../game-state.js';

export default function Lance({ scene, cameraRef, playerRef }) {
	// const modelPath = '/models/knights/blue_knight.glb';

	// Local storage of the current animation playing
	const [currentAnimation, setCurrentAnimation] = useState('');
	// Names of animations embedded in the models .glb
	const [animationNames, setAnimationNames] = useState([]);
	const baseSphereRef = useRef(null);
	const tipSphereRef = useRef(null);
	const coneMeshRef = useRef(null);

	const planeRef = useRef(null);
	const rayLineRef = useRef(null);
	const raycaster = new THREE.Raycaster();
	const mouse = new THREE.Vector2();

	// Create the model and animator instance
	// const { model, animations, playAnimation, setMaterial, material } = useAnimator(
	// 	'Blue Knight',
	// 	modelPath,
	// 	scene
	// );

	// Init the model position and animation
	useEffect(() => {
		if (!baseSphereRef.current || !tipSphereRef.current) {
			let geometry = new THREE.SphereGeometry(0.2, 4, 4);
			let material = new THREE.MeshBasicMaterial({ color: 0x50a05a });
			baseSphereRef.current = new THREE.Mesh(geometry, material);
			baseSphereRef.current.name = '[LANCE] Base sphere';
			// sphereRef.current.rotation.set(0, flipped ? Math.PI / 2 : -Math.PI / 2, 0);
			scene.add(baseSphereRef.current);

			geometry = new THREE.SphereGeometry(0.1, 4, 4);
			material = new THREE.MeshBasicMaterial({ color: 0x883ead });
			tipSphereRef.current = new THREE.Mesh(geometry, material);
			tipSphereRef.current.name = '[LANCE] Tip sphere';
			scene.add(tipSphereRef.current);

			const coneMaterial = new THREE.MeshBasicMaterial({ color: 0x3333ff });
			const coneGeometry = new THREE.ConeGeometry(0.2, 1, 16, 1, true); // open-ended cone
			coneMeshRef.current = new THREE.Mesh(coneGeometry, coneMaterial);
			coneMeshRef.current.name = '[LANCE] Cone';
			scene.add(coneMeshRef.current);

			// show line coming out from tip of lance
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

	// Init mouse move listener
	// useEffect(() => {
	// 	if (!baseSphereRef || !tipSphereRef.current) return;

	// 	const onMouseMove = (event) => {
	// 		const w = window.innerWidth;
	// 		const h = window.innerHeight;
	// 		const gap = 4;
	// 		const topHeight = h * 0.7 - gap / 2;
	// 		const topYStart = h - topHeight;

	// 		if (event.clientY < topYStart) return;

	// 		const relativeY = event.clientY - topYStart;
	// 		mouse.x = (event.clientX / w) * 2 - 1;
	// 		mouse.y = -(relativeY / topHeight) * 2 + 1;
	// 	};

	// 	window.addEventListener('mousemove', onMouseMove);
	// 	return () => window.removeEventListener('mousemove', onMouseMove);
	// }, []);

	useEffect(() => {
		if (!baseSphereRef || !tipSphereRef.current) return;

		const onMouseMove = (event) => {
			const w = window.innerWidth;
			const h = window.innerHeight;

			// Normalize mouse X/Y to full screen space (-1 to 1)
			mouse.x = (event.clientX / w) * 2 - 1;
			mouse.y = -(event.clientY / h) * 2 + 1;
		};

		window.addEventListener('mousemove', onMouseMove);
		return () => window.removeEventListener('mousemove', onMouseMove);
	}, []);

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

			// Update base to player position
			const playerPos = playerRef.current.position.clone();

			// Recompute camera-facing plane every frame
			planeRef.current = getCameraForwardPlane(cameraRef.current, 50);

			// Recalculate the intersection based on mouse position
			raycaster.setFromCamera(mouse, cameraRef.current);
			const intersection = new THREE.Vector3();

			if (raycaster.ray.intersectPlane(planeRef.current, intersection)) {
				// Create aim vector relative to player position, not previous lance position
				const aimVector = new THREE.Vector3().subVectors(intersection, playerPos).normalize();

				// Player direction constraints
				const playerForward = new THREE.Vector3(0, 0, -1);
				playerRef.current.getWorldDirection(playerForward).normalize();
				const playerRight = new THREE.Vector3()
					.crossVectors(playerForward, new THREE.Vector3(0, 1, 0))
					.normalize();

				// Check if aim is on left side and clamp if needed
				const dot = aimVector.dot(playerRight);
				if (dot < 0) {
					const clampedAim = aimVector.clone().projectOnPlane(playerRight).normalize();
					aimVector.copy(clampedAim);
				}

				// Always calculate positions based on player position, not based on previous lance position
				const tipPos = playerPos.clone().add(aimVector.clone().multiplyScalar(2));
				const basePos = playerPos.clone();
				const offset = new THREE.Vector3(0, 0.5, 0);

				// Update lance positions
				tipSphereRef.current.position.copy(tipPos.clone().sub(offset));
				baseSphereRef.current.position.copy(basePos.clone().sub(offset));

				// Update cone geometry
				if (coneMeshRef.current) {
					const direction = new THREE.Vector3().subVectors(
						tipSphereRef.current.position,
						baseSphereRef.current.position
					);
					const length = direction.length();

					coneMeshRef.current.scale.set(1, length, 0.5);

					const midPoint = new THREE.Vector3()
						.addVectors(baseSphereRef.current.position, tipSphereRef.current.position)
						.multiplyScalar(0.5);
					coneMeshRef.current.position.copy(midPoint);

					coneMeshRef.current.quaternion.setFromUnitVectors(
						new THREE.Vector3(0, 1, 0),
						direction.clone().normalize()
					);
				}

				// Now set up raycaster for collision detection (after positioning lance)
				const lanceDirection = new THREE.Vector3()
					.subVectors(tipSphereRef.current.position, baseSphereRef.current.position)
					.normalize();

				raycaster.set(baseSphereRef.current.position, lanceDirection);

				// Debug ray
				if (GameState.debug && rayLineRef.current) {
					const rayStart = baseSphereRef.current.position.clone();
					const rayEnd = tipSphereRef.current.position
						.clone()
						.add(lanceDirection.clone().multiplyScalar(0.5));

					const positions = rayLineRef.current.geometry.attributes.position.array;
					positions[0] = rayStart.x;
					positions[1] = rayStart.y;
					positions[2] = rayStart.z;
					positions[3] = rayEnd.x;
					positions[4] = rayEnd.y;
					positions[5] = rayEnd.z;
					rayLineRef.current.geometry.attributes.position.needsUpdate = true;
				}

				// Check for collisions
				const ignored = new Set([
					baseSphereRef.current.uuid,
					tipSphereRef.current.uuid,
					coneMeshRef.current.uuid,
					playerRef.current.uuid,
					rayLineRef.current?.uuid,
				]);

				const intersects = raycaster
					.intersectObjects(scene.children, true)
					.filter((hit) => !ignored.has(hit.object.uuid));

				if (intersects.length > 0) {
					console.log('Hit object:', intersects[0].object);
					// Handle collision here
				}
			}
		};

		update();
	}, [cameraRef, playerRef]);

	return <></>;
}
