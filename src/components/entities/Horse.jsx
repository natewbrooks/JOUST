import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Clock } from 'three';
import { useGLTFModel } from '../../hooks/useGLTFModel';

export default function Horse({
	scene,
	position = { x: 0, y: 0, z: 0 },
	isPlayer = false,
	flipped = false,
}) {
	const modelPath = '/models/horse/Horse.glb';
	const clock = useRef(new Clock());
	const [currentAnimation, setCurrentAnimation] = useState('Idle');

	const { model, animations, playAnimation, updateMixer, mixer } = useGLTFModel(modelPath, scene);

	// Set model position
	useEffect(() => {
		if (!model) return;
		model.position.set(position.x, position.y, position.z);
		model.rotation.set(0, flipped ? Math.PI / 2 : -Math.PI / 2, 0);
	}, [model, position, flipped]);

	// Animation loop
	useEffect(() => {
		let frameId;
		const animate = () => {
			const delta = clock.current.getDelta();
			updateMixer(delta);
			frameId = requestAnimationFrame(animate);
		};
		animate();
		return () => cancelAnimationFrame(frameId);
	}, [updateMixer]);

	// Auto return to Idle after "End" animations
	useEffect(() => {
		if (!mixer || !currentAnimation) return;

		const onFinished = () => {
			if (currentAnimation.includes('End')) {
				playAnimation('Idle');
				setCurrentAnimation('Idle');
			}
		};

		mixer.addEventListener('finished', onFinished);
		return () => {
			mixer.removeEventListener('finished', onFinished);
		};
	}, [mixer, currentAnimation]);

	const animationNames = ['Idle', 'Walk', 'Run', 'Attack', 'Die'];

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
