import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import gsap from 'gsap';

import ButtonPromptUI from './components/ui/ButtonPromptUI';
import Horse from './components/entities/Horse.jsx';
import { swapCameraView, setSideViewCamera, setPovCamera } from './utils/cameraTransitions.jsx';

import { initGraphics } from './utils/initGraphics.jsx';
import Player from './components/entities/Player.jsx';
import Opponent from './components/entities/Opponent.jsx';

import GameState from './game-state.js';

function App() {
	const sceneRef = useRef(new THREE.Scene());
	const mainCameraRef = useRef();
	const sideViewCameraRef = useRef(); // ORTHOGRAPHIC CAMERA
	const playerPovCameraRef = useRef(); // PERSPECTIVE CAMERA

	const povCameraInitRef = useRef(false); // IS PLAYER POV CAMERA INITIALIZED

	const playerRef = useRef(); // PLAYER REF
	const opponentRef = useRef(); // Opponent REF

	const [opponentMPH, setOpponentMPH] = useState(0);
	const [playerMPH, setPlayerMPH] = useState(0);

	// Animation frame reference
	const animationFrameRef = useRef(null);

	// Starting positions
	const playerStartX = -18;
	const opponentStartX = 18;
	const moveSpeed = 7; // 20mph constant speed

	// Initialize positions
	const playerPosRef = useRef({ x: playerStartX, y: 2.5, z: -0.5 });
	const opponentPosRef = useRef({ x: opponentStartX, y: 2.5, z: 1 });

	const [playerPos, setPlayerPos] = useState(playerPosRef.current);
	const [opponentPos, setOpponentPos] = useState(opponentPosRef.current);

	const horsesPassedRef = useRef(false);
	const hasAnimatedRef = useRef(false); // Track if the stop animation already ran

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

		// For a wider view to frame horses:
		setSideViewCamera(orthoCamera, { distance: 20, height: 1.5, zoom: 75 });

		sideViewCameraRef.current = orthoCamera;
		playerPovCameraRef.current = perspectiveCamera;

		const { dispose } = initGraphics(scene, playerPovCameraRef, sideViewCameraRef);
		return () => dispose();
	}, []);

	useEffect(() => {
		GameState.startRound();
	}, []);

	// Animation loop for constant speed
	useEffect(() => {
		let lastTime = null;

		const animate = (timestamp) => {
			if (!lastTime) lastTime = timestamp;
			const deltaTime = (timestamp - lastTime) / 1000; // Convert to seconds
			lastTime = timestamp;

			const player = playerPosRef.current;
			const opponent = opponentPosRef.current;

			horsesPassedRef.current = player.x >= opponent.x;

			if (horsesPassedRef.current && !hasAnimatedRef.current) {
				hasAnimatedRef.current = true;

				// Animate player x to opponentStartX
				gsap.to(player, {
					x: opponentStartX,
					duration: 12,
					ease: 'power2.out',
				});

				// Animate opponent x to playerStartX
				gsap.to(opponent, {
					x: playerStartX,
					duration: 12,
					ease: 'power2.out',
				});

				// Animate player MPH to 0
				gsap.to(
					{},
					{
						duration: 10,
						ease: 'power2.out',
						onUpdate: function () {
							setPlayerMPH((prev) => gsap.utils.interpolate(prev, 0, this.progress()));
						},
					}
				);

				// Animate opponent MPH to 0
				gsap.to(
					{},
					{
						duration: 10,
						ease: 'power2.out',
						onUpdate: function () {
							setOpponentMPH((prev) => gsap.utils.interpolate(prev, 0, this.progress()));
						},
					}
				);
			} else {
				// Normal movement before pass
				if (GameState.can_move) {
					playerPosRef.current.x += moveSpeed * deltaTime;
					opponentPosRef.current.x -= moveSpeed * deltaTime;

					setPlayerMPH(moveSpeed);
					setOpponentMPH(moveSpeed);
				}
			}

			// Sync with React state (for UI + rendering children)
			setPlayerPos({ ...player });
			setOpponentPos({ ...opponent });

			animationFrameRef.current = requestAnimationFrame(animate);
		};

		// Start the animation loop
		animationFrameRef.current = requestAnimationFrame(animate);

		// Cleanup function
		return () => {
			if (animationFrameRef.current) {
				cancelAnimationFrame(animationFrameRef.current);
			}
		};
	}, []);

	useEffect(() => {
		if (playerRef.current && opponentRef.current) {
			setPovCamera(
				playerPovCameraRef.current,
				playerRef.current.position,
				opponentRef.current.position,
				povCameraInitRef.current,
				playerRef.current,
				horsesPassedRef.current
			);
		}
	}, [playerPos, opponentPos]);

	return (
		<div>
			<Opponent
				scene={sceneRef.current}
				opponentRef={opponentRef}
				position={opponentPos}
				team={'red'}
				flipped={false}
			/>
			<Player
				scene={sceneRef.current}
				playerRef={playerRef}
				cameraRef={playerPovCameraRef}
				position={playerPos}
				team={'blue'}
				flipped={true}
			/>

			<div className='banner border-b-8 border-darkcream'>
				<div className='flex w-full justify-center space-x-8 py-2 bg-cream'>
					<div className='font-medieval text-black font-bold text-5xl'>JOUST.</div>
				</div>
			</div>

			<div className='center-screen'>
				<div className='w-full flex justify-center items-center'>
					{GameState.round_countdown_timer > 0 ? (
						<div className='text-black bg-cream w-[100px] text-center pt-2 rounded-full h-fit font-medieval text-8xl'>
							{GameState.round_countdown_timer}
						</div>
					) : (
						''
					)}
				</div>
			</div>

			<div className='footer flex flex-col space-y-4'>
				<div className='flex font-medieval justify-center w-full text-cream'>
					Player: {playerMPH.toFixed(1)} MPH | Opponent: {opponentMPH.toFixed(1)} MPH
				</div>
			</div>
		</div>
	);
}

export default App;
