import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { useAnimator } from '../../hooks/useAnimator';
import Horse from './Horse';
import { setPovCamera } from '../../utils/cameraTransitions';
import Lance from './objects/Lance';
import Shield from './objects/Shield';

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

	const rightHandRef = useRef(null);
	const leftHandRef = useRef(null);
	const anchorRef = useRef(null);

	// Load the Knight model
	const { model, animations, playAnimation, setMaterial, material } = useAnimator(
		'Player Knight',
		modelPath,
		scene,
		(loadedModel) => {
			loadedModel.rotation.set(0, flipped ? Math.PI / 2 : -Math.PI / 2, 0);
			playerRef.current = loadedModel;

			// Find the right hand bone
			let rHandBone = null,
				anchorBone = null,
				lHandBone = null;
			loadedModel.traverse((child) => {
				if (child.isBone) {
					const childName = child.name.toLowerCase();
					if (childName.includes('handr')) {
						rHandBone = child;
						console.log('Found Hand.R bone:', rHandBone.name);
						rightHandRef.current = rHandBone;
					} else if (childName.includes('head')) {
						anchorBone = child;
						console.log('Found bone:', anchorBone.name);
						anchorRef.current = anchorBone;
						// Pass pov camera anchor to parent
						povCameraAnchorRef.current = anchorRef.current;
					} else if (childName.includes('handl')) {
						lHandBone = child;
						console.log('Found Hand.L bone:', lHandBone.name);
						leftHandRef.current = lHandBone;
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
			<Shield handRef={leftHandRef} />
			<Lance
				scene={scene}
				cameraRef={cameraRef}
				position={position}
				handRef={rightHandRef}
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
