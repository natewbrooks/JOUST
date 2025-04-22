import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import gsap from 'gsap';
import ButtonPromptUI from './components/ui/ButtonPromptUI';
import Horse from './components/entities/Horse.jsx';
import { swapCameraView, setSideViewCamera, setPovCamera } from './utils/cameraTransitions.jsx';

import { initGraphics } from './utils/initGraphics.jsx';
import Player from './components/entities/Player.jsx';
import Opponent from './components/entities/Opponent.jsx';

function App() {
	const sceneRef = useRef(new THREE.Scene());
	const mainCameraRef = useRef();
	const sideViewCameraRef = useRef(); // ORTHOGRAPHIC CAMERA
	const playerPovCameraRef = useRef(); // PERSPECTIVE CAMERA

	const povCameraInitRef = useRef(false); // IS PLAYER POV CAMERA INITIALIZED

	const playerRef = useRef(); // PLAYER REF
	const opponentRef = useRef(); // Opponent REF

	const [clicks, setClicks] = useState(0);
	const [mph, setMph] = useState(0);
	const [wKeyActive, setWKeyActive] = useState(false);
	const [wKeyPressedVisual, setWKeyPressedVisual] = useState(false);

	const pressTimestamps = useRef([]);
	const mphState = useRef({ val: 0 });

	useEffect(() => {
		const handleKeyDown = (e) => {
			const key = e.key.toLowerCase();
			if (key === 'w' && !e.repeat) {
				if (!wKeyActive) setWKeyActive(true);
				setWKeyPressedVisual(true);
				setClicks((prev) => prev + 1);

				const now = performance.now();
				pressTimestamps.current.push(now);
			}
		};

		const handleKeyUp = (e) => {
			if (e.key.toLowerCase() === 'a') {
				setWKeyPressedVisual(false);
			}
		};

		window.addEventListener('keydown', handleKeyDown);
		window.addEventListener('keyup', handleKeyUp);
		return () => {
			window.removeEventListener('keydown', handleKeyDown);
			window.removeEventListener('keyup', handleKeyUp);
		};
	}, [wKeyActive]);

	useEffect(() => {
		const quickMph = gsap.quickTo(mphState.current, 'val', {
			duration: 0.5,
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

	// Init cameras and graphics
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

		setSideViewCamera(orthoCamera);

		sideViewCameraRef.current = orthoCamera;
		playerPovCameraRef.current = perspectiveCamera;

		const { dispose } = initGraphics(scene, playerPovCameraRef, sideViewCameraRef);
		return () => dispose();
	}, []);

	useEffect(() => {
		setPovCamera(
			playerPovCameraRef.current,
			playerRef.current.position,
			opponentRef.current.position,
			povCameraInitRef.current
		);
	}, [playerRef.current, opponentRef.current, mph]);

	return (
		<div>
			<Opponent
				scene={sceneRef.current}
				opponentRef={opponentRef}
				position={{ x: -10, y: 2.5, z: -0.5 }}
				team={'red'}
				flipped={true}
			/>
			<Player
				scene={sceneRef.current}
				playerRef={playerRef}
				cameraRef={playerPovCameraRef}
				position={{ x: 10 - mph, y: 2.5, z: 1 }}
				team={'blue'}
				flipped={false}
			/>

			<div className='banner border-b-8 border-darkcream'>
				<div className='flex w-full justify-center space-x-8 py-2 bg-cream'>
					<div className='font-medieval text-black font-bold text-5xl'>JOUST.</div>
				</div>
			</div>

			<div className='footer flex flex-col space-y-4'>
				<div className='flex w-full justify-center space-x-2'>
					<ButtonPromptUI
						letter='W'
						isPressed={wKeyPressedVisual}
						isActive={wKeyActive}
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
