import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useModel } from '../../../hooks/useModel.jsx';

export default function Arena({ scene, cameraRef, position }) {
	const modelPath = '/models/environment/JoustArena.glb';
	const arenaLoaded = useRef(false);
	const groundLoaded = useRef(false); // Track ground so we don't add it repeatedly

	const { model, setMaterial, material } = useModel('Joust Arena', modelPath, (loadedModel) => {
		console.log('Arena model loaded:', loadedModel);
	});

	useEffect(() => {
		if (!arenaLoaded.current && model) {
			model.position.set(position?.x || 0, position?.y || 0, position?.z || 19);
			model.rotation.y = Math.PI / 2;

			scene.add(model);
			arenaLoaded.current = true;
		}

		// Add ground plane once
		if (!groundLoaded.current) {
			const groundGeometry = new THREE.PlaneGeometry(10000, 10000);
			const groundMaterial = new THREE.MeshStandardMaterial({ color: '#638a3e' });
			const groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);

			groundMesh.rotation.x = -Math.PI / 2; // Rotate flat on XZ plane
			groundMesh.position.y = 0; // Ground at y = 0

			scene.add(groundMesh);
			groundLoaded.current = true;
		}
	}, [model, scene, position]);

	return null;
}
