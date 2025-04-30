import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { useAnimator } from '../../hooks/useAnimator';
import Horse from './Horse';
import { setPovCamera } from '../../utils/cameraTransitions';
import Lance from './objects/Lance';

export default function Player({
	scene,
	position,
	playerRef,
	team,
	flipped,
	cameraRef,
	povCameraAnchorRef,
}) {
	const modelPath = '/models/knights/Knight.glb';

	const [currentAnimation, setCurrentAnimation] = useState('');
	const [animationNames, setAnimationNames] = useState([]);

	const handRef = useRef(null);
	const neckRef = useRef(null);

	// Load the Knight model
	const { model, animations, playAnimation, setMaterial, material } = useAnimator(
		'Player Knight',
		modelPath,
		scene,
		(loadedModel) => {
			loadedModel.rotation.set(0, flipped ? Math.PI / 2 : -Math.PI / 2, 0);
			playerRef.current = loadedModel;

			// Find the right hand bone
			let handBone = null,
				neckBone = null;
			loadedModel.traverse((child) => {
				if (child.isBone) {
					if (child.name.toLowerCase().includes('handr')) {
						handBone = child;
						console.log('Found Hand.R bone:', handBone.name);
						handRef.current = handBone;
					} else if (child.name.toLowerCase().includes('neck')) {
						neckBone = child;
						console.log('Found Neck bone:', neckBone.name);
						neckRef.current = neckBone;
						// Pass pov camera anchor to parent
						povCameraAnchorRef.current = neckRef.current;
					}
				}
			});
		}
	);

	// Update knight position
	useEffect(() => {
		if (!position || !model) return;
		model.position.set(position.x, position.y - 1.5, position.z);
	}, [position, model]);

	return (
		<>
			<Lance
				scene={scene}
				cameraRef={cameraRef}
				position={position}
				handRef={handRef}
			/>
			<Horse
				scene={scene}
				position={{ x: position.x, y: position.y - 2.5, z: position.z }}
				flipped={flipped}
				isPlayer={true}
			/>
		</>
	);
}
