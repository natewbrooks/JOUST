import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { useAnimator } from '../../hooks/useAnimator';
import Horse from './Horse';

export default function Opponent({ scene, position, opponentRef, team, flipped }) {
	// const modelPath = '/models/knights/blue_knight.glb';

	// Local storage of the current animation playing
	const [currentAnimation, setCurrentAnimation] = useState('');
	// Names of animations embedded in the models .glb
	const [animationNames, setAnimationNames] = useState([]);
	const sphereRef = useRef(null);

	// Create the model and animator instance
	// const { model, animations, playAnimation, setMaterial, material } = useAnimator(
	// 	'Blue Knight',
	// 	modelPath,
	// 	scene
	// );

	// Init the model position and animation
	useEffect(() => {
		if (!sphereRef.current) {
			const geometry = new THREE.SphereGeometry(0.25, 4, 4);
			const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
			sphereRef.current = new THREE.Mesh(geometry, material);
			sphereRef.current.name = 'OpponentHead';
			sphereRef.current.userData = { type: 'opponent', part: 'head' }; // Tagging opponent head

			sphereRef.current.rotation.set(0, flipped ? Math.PI / 2 : -Math.PI / 2, 0);
			scene.add(sphereRef.current);

			opponentRef.current = sphereRef.current; // Pass back up
		}
	}, []);

	// Update loop
	useEffect(() => {
		if (!position || !sphereRef.current) return;

		sphereRef.current.position.set(position.x, position.y, position.z);
	}, [position, sphereRef.current]);

	return (
		<>
			<Horse
				scene={scene}
				position={{ x: position.x, y: position.y - 2.5, z: position.z }}
				flipped={flipped}
				isPlayer={false}
			/>
		</>
	);
}
