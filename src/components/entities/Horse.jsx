import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { useAnimator } from '../../hooks/useAnimator';

export default function Horse({ scene, position = { x: 0, y: 0, z: 0 }, flipped = false }) {
	const modelPath = '/models/horse/Horse.glb';
	const materialPath = '/models/horse/Materials/';
	const materials = {
		White: materialPath + '/MaterialWhite.png',
		Gray: materialPath + '/MaterialGray.png',
		Brown: materialPath + '/MaterialBrown.png',
		LightBrown: materialPath + '/MaterialLightBrown.png',
		BrownWhite: materialPath + '/MaterialBrownWhite.png',
		Sepia: materialPath + '/MaterialSepia.png',
		Inverted: materialPath + '/MaterialInverted.png',
		Funky: materialPath + '/MaterialFunky.png',
		Solarized: materialPath + '/MaterialSolarized.png',
		Scrambled: materialPath + '/MaterialScrambled.png',
		Polarized: materialPath + '/MaterialPolarized.png',
		PurpleTint: materialPath + '/MaterialPurpleTint.png',
		EdgeDetection: materialPath + '/MaterialEdgeDetection.png',
	};

	// Local storage of the current animation playing
	const [currentAnimation, setCurrentAnimation] = useState('');
	// Names of animations embedded in the models .glb
	const [animationNames, setAnimationNames] = useState([]);

	// Create the model and animator instance
	const { model, animations, playAnimation, setMaterial } = useAnimator('Horse', modelPath, scene);

	const randomizeMaterial = () => {
		// Set random material
		const materialKeys = Object.keys(materials);
		const materialValues = Object.values(materials);
		const randomInt = Math.floor(Math.random() * materialValues.length);

		setMaterial(materialValues[randomInt], materialKeys[randomInt]);
	};

	// Init the model pos and anim
	useEffect(() => {
		if (!model) return;
		// Set model position according to the props
		model.position.set(position.x, position.y, position.z);
		model.rotation.set(0, flipped ? Math.PI / 2 : -Math.PI / 2, 0);

		randomizeMaterial();

		// Set animation names from the Array<AnimationClip> and play the Run animation by default
		setAnimationNames(animations.map((anim) => anim.name));
		playAnimation('Run');
	}, [model]);

	const handlePlay = (name) => {
		playAnimation(name);
		setCurrentAnimation(name);
	};

	return (
		<div className='absolute top-4 left-4 z-80 flex flex-col gap-4 p-4 bg-black/40 text-white rounded shadow-lg max-w-sm'>
			<h2 className='text-lg font-bold'>Animations</h2>
			{animationNames.map((name, i) => (
				<button
					key={i}
					onClick={() => handlePlay(name)}
					className={`w-full px-4 py-1 rounded ${
						currentAnimation === name ? 'bg-blue-800' : 'bg-blue-600 hover:bg-blue-700'
					}`}>
					{name}
				</button>
			))}
		</div>
	);
}
