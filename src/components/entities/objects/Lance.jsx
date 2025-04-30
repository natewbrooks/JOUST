import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { getCameraForwardPlane } from '../../../utils/cameraTransitions';
import GameState from '../../../game-state.js';
import { useModel } from '../../../hooks/useModel.jsx';

export default function Lance({ scene, cameraRef, position, handRef }) {
	const modelPath = '/models/lance/Lance.glb';

	// Local storage of the current animation playing
	// const [currentAnimation, setCurrentAnimation] = useState('');
	// Names of animations embedded in the models .glb
	// const [animationNames, setAnimationNames] = useState([]);
	const baseSphereRef = useRef(null);
	const tipSphereRef = useRef(null);
	const coneMeshRef = useRef(null);

	const isLanceLoded = useRef(false);

	const hasHitThisRound = useRef(false);
	const mousePosRef = useRef(null);

	const planeRef = useRef(null);
	const rayLineRef = useRef(null);
	const raycaster = new THREE.Raycaster();
	const mouse = new THREE.Vector2();

	// Use a ref for the aim vector instead of recreating it every frame
	const aimVectorRef = useRef(new THREE.Vector3(0, 0, -1));

	// Create the model and animator instance
	const { model, setMaterial, material } = useModel('Red Lance', modelPath, (loadedModel) => {
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
	});

	// Init the debug spheres
	useEffect(() => {
		if (!baseSphereRef.current || !tipSphereRef.current) {
			let geometry = new THREE.SphereGeometry(0.2, 4, 4);
			let material = new THREE.MeshBasicMaterial({ color: 0x50a05a });
			baseSphereRef.current = new THREE.Mesh(geometry, material);
			baseSphereRef.current.name = '[LANCE] Base sphere';
			scene.add(baseSphereRef.current);

			geometry = new THREE.SphereGeometry(0.1, 4, 4);
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
		if (!model || !cameraRef.current || !mousePosRef.current || !handRef.current) return;

		if (!isLanceLoded.current) {
			scene.add(model);
			isLanceLoded.current = true;
		}

		const offset = new THREE.Vector3(0.25, 0, 0);
		// Set the model to the hand's world position
		const handWorldPos = new THREE.Vector3();
		handRef.current.getWorldPosition(handWorldPos);
		model.position.copy(handWorldPos).add(offset);

		// Ray from camera to mouse
		const tempRaycaster = new THREE.Raycaster();
		tempRaycaster.setFromCamera(mousePosRef.current, cameraRef.current);
		const mouseDirection = tempRaycaster.ray.direction.clone().normalize();

		// Rotate so that -Z faces the mouse
		const forwardVector = new THREE.Vector3(0, 0, 1); // Model forward
		const targetQuaternion = new THREE.Quaternion().setFromUnitVectors(
			forwardVector,
			mouseDirection
		);
		model.quaternion.copy(targetQuaternion);
	}, [position, model, cameraRef, mousePosRef.current, handRef]);

	// Continuous update
	useEffect(() => {
		const update = () => {
			requestAnimationFrame(update);

			if (!cameraRef.current || !baseSphereRef.current || !tipSphereRef.current || !handRef.current)
				return;

			const offset = new THREE.Vector3(0.25, 0, 0);

			// Always get up-to-date world position of the hand
			const handWorldPos = new THREE.Vector3();
			handRef.current.getWorldPosition(handWorldPos);

			const handWorldPosWithOffset = handWorldPos.clone().add(offset);

			// Compute mouse intersection point
			planeRef.current = getCameraForwardPlane(cameraRef.current, 50);
			raycaster.setFromCamera(mouse, cameraRef.current);
			const intersection = new THREE.Vector3();

			if (raycaster.ray.intersectPlane(planeRef.current, intersection)) {
				// Vector from hand to mouse hit
				aimVectorRef.current.subVectors(intersection, handWorldPosWithOffset).normalize();

				const lanceLength = 2.5;
				const tipPos = handWorldPosWithOffset
					.clone()
					.add(aimVectorRef.current.clone().multiplyScalar(lanceLength));

				// Update lance model position + rotation
				if (model) {
					model.position.copy(handWorldPosWithOffset);
					const forward = new THREE.Vector3(0, 0, 1); // model forward
					const rotationQuat = new THREE.Quaternion().setFromUnitVectors(
						forward,
						aimVectorRef.current
					);
					model.quaternion.copy(rotationQuat);
				}

				// Debug visuals
				baseSphereRef.current.position.copy(handWorldPosWithOffset);
				tipSphereRef.current.position.copy(tipPos);

				if (GameState.debug && rayLineRef.current) {
					const positions = rayLineRef.current.geometry.attributes.position.array;
					positions[0] = handWorldPosWithOffset.x;
					positions[1] = handWorldPosWithOffset.y;
					positions[2] = handWorldPosWithOffset.z;
					positions[3] = tipPos.x;
					positions[4] = tipPos.y;
					positions[5] = tipPos.z;
					rayLineRef.current.geometry.attributes.position.needsUpdate = true;
				}

				// 🔴 Collision ray
				const lanceDirection = new THREE.Vector3()
					.subVectors(tipPos, handWorldPosWithOffset)
					.normalize();
				raycaster.set(handWorldPos, lanceDirection);

				const ignored = new Set([
					baseSphereRef.current.uuid,
					tipSphereRef.current.uuid,
					model?.uuid,
					rayLineRef.current?.uuid,
				]);
				model?.traverse((child) => ignored.add(child.uuid));

				const intersects = raycaster
					.intersectObjects(scene.children, true)
					.filter((hit) => hit.object.userData?.type === 'opponent');

				if (intersects.length > 0 && !hasHitThisRound.current) {
					const firstHit = intersects[0].object;
					console.log('✅ Hit opponent:', firstHit.name);
					hasHitThisRound.current = true;
					if (firstHit.userData.part === 'head') {
						console.log('💥 HEADSHOT!');
					}
				}
			}
		};

		update();
	}, [cameraRef, model]);

	return <></>;
}
