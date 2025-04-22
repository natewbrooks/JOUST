import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { getCameraForwardPlane } from '../../../utils/cameraTransitions';

export default function Lance({ scene, cameraRef, playerRef }) {
	// const modelPath = '/models/knights/blue_knight.glb';

	// Local storage of the current animation playing
	const [currentAnimation, setCurrentAnimation] = useState('');
	// Names of animations embedded in the models .glb
	const [animationNames, setAnimationNames] = useState([]);
	const baseSphereRef = useRef(null);
	const tipSphereRef = useRef(null);
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
			// sphereRef.current.rotation.set(0, flipped ? Math.PI / 2 : -Math.PI / 2, 0);
			scene.add(tipSphereRef.current);

			const lineMaterial = new THREE.LineBasicMaterial({ color: 0xffff00 });
			const points = [new THREE.Vector3(), new THREE.Vector3()];
			const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
			rayLineRef.current = new THREE.Line(lineGeometry, lineMaterial);
			rayLineRef.current.name = '[DEBUG] Ray Line';
			scene.add(rayLineRef.current);
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

			// Recompute camera-facing plane
			if (!planeRef.current) {
				planeRef.current = getCameraForwardPlane(cameraRef.current, 50);
			}

			// Recalculate the intersection first (you already do this)
			raycaster.setFromCamera(mouse, cameraRef.current);
			const intersection = new THREE.Vector3();
			raycaster.ray.intersectPlane(planeRef.current, intersection);

			// Now create a ray that starts at the lance tip and aims at that intersection point
			const tipPos = tipSphereRef.current.position.clone();
			const rayDir = intersection.clone().sub(tipPos).normalize();
			raycaster.ray.origin.copy(tipPos);
			raycaster.ray.direction.copy(rayDir);

			const intersects = raycaster.intersectObjects(scene.children, true);

			const rayStart = raycaster.ray.origin.clone();
			const rayEnd = raycaster.ray.origin
				.clone()
				.add(raycaster.ray.direction.clone().multiplyScalar(2)); // 20 units out

			if (rayLineRef.current) {
				const positions = rayLineRef.current.geometry.attributes.position.array;
				positions[0] = rayStart.x;
				positions[1] = rayStart.y;
				positions[2] = rayStart.z;
				positions[3] = rayEnd.x;
				positions[4] = rayEnd.y;
				positions[5] = rayEnd.z;
				rayLineRef.current.geometry.attributes.position.needsUpdate = true;
			}

			if (intersects.length > 0) {
				console.log('Hit object:', intersects[0].object);
			}

			if (raycaster.ray.intersectPlane(planeRef.current, intersection)) {
				const aimVector = new THREE.Vector3().subVectors(intersection, playerPos).normalize();

				// Assume player is facing -Z (forward)
				const playerForward = new THREE.Vector3(0, 0, -1);
				playerRef.current.getWorldDirection(playerForward).normalize();

				// Compute right vector as forward.cross(up)
				const playerRight = new THREE.Vector3()
					.crossVectors(playerForward, new THREE.Vector3(0, 1, 0))
					.normalize();

				// Check if aim is on left side
				const dot = aimVector.dot(playerRight); // < 0 means left

				if (dot < 0) {
					// Clamp aim to stay on or right of forward direction
					// Project aim onto the plane perpendicular to playerRight, then renormalize
					const clampedAim = aimVector.clone().projectOnPlane(playerRight).normalize();
					aimVector.copy(clampedAim);
				}

				const tipPos = playerPos.clone().add(aimVector.clone().multiplyScalar(2));
				const basePos = playerPos.clone(); // keep near the body
				const offset = new THREE.Vector3(0, 0.5, 0);

				tipSphereRef.current.position.copy(tipPos.clone().sub(offset));
				baseSphereRef.current.position.copy(basePos.clone().sub(offset));
			}
		};

		update();
	}, [cameraRef, playerRef]);

	return <></>;
}
