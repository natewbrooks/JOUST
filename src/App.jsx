import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import gsap from 'gsap';
import ButtonPromptUI from './components/ui/ButtonPromptUI';
import Horse from './components/entities/Horse.jsx';
import { toggleHitView, toggleSideView, transitionToCamera } from './utils/cameraTransitions.jsx';

import { initGraphics } from './utils/initGraphics.jsx';

function App() {
	const sceneRef = useRef(new THREE.Scene());
	const mainCameraRef = useRef();
	const orthoCameraRef = useRef();
	const perspectiveCameraRef = useRef();

	const [clicks, setClicks] = useState(0);
	const [mph, setMph] = useState(0);
	const [aKeyActive, setAKeyActive] = useState(false);
	const [aKeyPressedVisual, setAKeyPressedVisual] = useState(false);

	const pressTimestamps = useRef([]);
	const mphState = useRef({ val: 0 });

	useEffect(() => {
		const handleKeyDown = (e) => {
			const key = e.key.toLowerCase();
			if (key === 'a' && !e.repeat) {
				if (!aKeyActive) setAKeyActive(true);
				setAKeyPressedVisual(true);
				setClicks((prev) => prev + 1);

				const now = performance.now();
				pressTimestamps.current.push(now);
			}
		};

		const handleKeyUp = (e) => {
			if (e.key.toLowerCase() === 'a') {
				setAKeyPressedVisual(false);
			}
		};

		window.addEventListener('keydown', handleKeyDown);
		window.addEventListener('keyup', handleKeyUp);
		return () => {
			window.removeEventListener('keydown', handleKeyDown);
			window.removeEventListener('keyup', handleKeyUp);
		};
	}, [aKeyActive]);

	useEffect(() => {
		const quickMph = gsap.quickTo(mphState.current, 'val', {
			duration: 0.2,
			ease: 'power2.out',
			onUpdate: () => {
				setMph(mphState.current.val);
			},
		});

		let lastClickTime = performance.now();
		let frame;

		const update = () => {
			const now = performance.now();

			pressTimestamps.current = pressTimestamps.current.filter((t) => now - t < 8000);
			const count = pressTimestamps.current.length;

			if (count > 0) {
				lastClickTime = now;
			}

			const normalized = Math.min(1, count / 60);
			const current = mphState.current.val;

			let target = 70 * normalized;

			const idleTime = (now - lastClickTime) / 1000;
			if (idleTime > 0.1) {
				const decayFactor = 1.2;
				const decayAmount = Math.pow(idleTime, 2) * decayFactor;
				target = Math.max(0, current - decayAmount);
			}

			quickMph(target);
			frame = requestAnimationFrame(update);
		};

		update();
		return () => cancelAnimationFrame(frame);
	}, []);

	// Init
	useEffect(() => {
		const scene = sceneRef.current;

		const zoom = 150;
		const orthoCamera = new THREE.OrthographicCamera(
			-window.innerWidth / zoom,
			window.innerWidth / zoom,
			window.innerHeight / zoom,
			-window.innerHeight / zoom,
			0.1,
			200
		);
		orthoCamera.position.z = 10;

		const perspectiveCamera = new THREE.PerspectiveCamera(
			80,
			window.innerWidth / window.innerHeight
		);

		toggleSideView(orthoCamera);
		toggleHitView(perspectiveCamera);

		orthoCameraRef.current = orthoCamera;
		perspectiveCameraRef.current = perspectiveCamera;
		mainCameraRef.current = orthoCamera;

		const { dispose } = initGraphics(scene, mainCameraRef);
		return () => dispose();
	}, []);

	return (
		<div>
			<Horse
				scene={sceneRef.current}
				position={{ x: -10, y: 0, z: -1 }}
				flipped={true}
				isPlayer={false}
			/>
			<Horse
				scene={sceneRef.current}
				position={{ x: 10, y: 0, z: 1 }}
				isPlayer={true}
			/>

			<div className='banner border-b-8 border-darkcream'>
				<div className='flex w-full justify-center space-x-8 py-2 bg-cream'>
					<button
						onClick={() => {
							// Create a temp OrthographicCamera that matches the current camera's transform
							const zoom = 150;
							const newCam = new THREE.OrthographicCamera(
								-window.innerWidth / zoom,
								window.innerWidth / zoom,
								window.innerHeight / zoom,
								-window.innerHeight / zoom,
								0.1,
								1000
							);

							// Match position and rotation from current main camera
							newCam.position.copy(mainCameraRef.current.position);
							newCam.rotation.copy(mainCameraRef.current.rotation);
							newCam.position.z = 10;

							// Make it the current camera for rendering and animation
							mainCameraRef.current = newCam;
							sceneRef.current.add(mainCameraRef.current);

							const from = mainCameraRef.current;
							const to = orthoCameraRef.current;

							transitionToCamera(from, to, () => {
								mainCameraRef.current = to;
							});
						}}
						className='bg-blue-200 px-2 font-medieval text-bkg'>
						Trigger Side View
					</button>
					<div className='font-medieval text-black font-bold text-5xl'>JOUST.</div>
					<button
						onClick={() => {
							// Create a new PerspectiveCamera
							const newCam = new THREE.PerspectiveCamera(
								100,
								window.innerWidth / window.innerHeight,
								0.1,
								1000
							);

							// Match the current position/rotation from orthoCamera
							const currPos = orthoCameraRef.current.position;
							const currRot = orthoCameraRef.current.rotation;

							newCam.position.copy(currPos);
							newCam.rotation.copy(currRot);

							// Update ref to new camera
							mainCameraRef.current = newCam;
							sceneRef.current.add(mainCameraRef.current);

							// Transition to the target camera (visually)
							const from = mainCameraRef.current;
							const to = perspectiveCameraRef.current;

							transitionToCamera(from, to, () => {
								mainCameraRef.current = to;
							});
						}}
						className='bg-red px-2 font-medieval text-bkg'>
						Trigger Hit View
					</button>
				</div>
			</div>

			<div className='footer flex flex-col space-y-4'>
				<div className='flex w-full justify-center space-x-2'>
					<ButtonPromptUI
						letter='A'
						isPressed={aKeyPressedVisual}
						isActive={aKeyActive}
					/>
				</div>
				<div className='flex font-medieval justify-center w-full text-cream'>
					{mph.toFixed(1)} MPH | {clicks} Click{clicks === 1 ? '' : 's'}
				</div>
			</div>
		</div>
	);
}

export default App;
