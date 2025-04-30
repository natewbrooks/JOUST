import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { useAnimator } from '../../hooks/useAnimator';
import Horse from './Horse';
import GameState from '../../game-state';

export default function Opponent({ scene, position, opponentRef, team, flipped }) {
	const modelPath = '/models/knights/Knight2.glb';

	const [currentAnimation, setCurrentAnimation] = useState('');
	const [animationNames, setAnimationNames] = useState([]);

	const { model, animations, playAnimation, setMaterial, material } = useAnimator(
		'Opponent Knight',
		modelPath,
		scene,
		(loadedModel) => {
			loadedModel.rotation.set(0, flipped ? Math.PI / 2 : -Math.PI / 2, 0);
			opponentRef.current = loadedModel;

			// Add hittable spheres to bone positions
			loadedModel.traverse((child) => {
				if (child.isBone) {
					const targetName = child.name.toLowerCase();
					const sphere = new THREE.Mesh(
						new THREE.SphereGeometry(targetName.includes('head') ? 0.3 : 0.2, 4, 4),
						new THREE.MeshBasicMaterial({
							visible: GameState.debug,
							color: targetName.includes('head') ? 0xff0000 : 0x00ff00,
							transparent: true,
							opacity: 0.5,
						})
					);
					sphere.name = `[Hitbox] ${child.name}`;
					sphere.userData.type = 'opponent';
					sphere.userData.part = targetName.includes('head') ? 'head' : 'body';
					child.add(sphere);
				}
			});
		}
	);

	useEffect(() => {
		if (!position || !model) return;
		model.position.set(position.x, position.y - 1.5, position.z);
	}, [position, model]);

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
