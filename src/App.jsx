import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import gsap from 'gsap';

import Cameras from './components/entities/objects/Cameras.jsx';

import Player from './components/entities/Player.jsx';
import Opponent from './components/entities/Opponent.jsx';

import GameState from './game-state.js';

function App() {
	const sceneRef = useRef(new THREE.Scene());
	// Camera stuff
	const sideViewCameraRef = useRef(null); // ORTHOGRAPHIC CAMERA
	const playerPovCameraRef = useRef(null); // PERSPECTIVE CAMERA
	const camerasInitRef = useRef(false); // IS PLAYER POV CAMERA INITIALIZED
	const povCameraAnchorRef = useRef(null); // The players neck bone ref

	// Knight stuff
	const playerRef = useRef(null); // PLAYER REF
	const opponentRef = useRef(null); // Opponent REF

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

			// horsesPassedRef.current = player.x >= opponent.x;

			// if (horsesPassedRef.current && !hasAnimatedRef.current) {
			// 	hasAnimatedRef.current = true;

			// 	// Animate player x to opponentStartX
			// 	gsap.to(player, {
			// 		x: opponentStartX,
			// 		duration: 12,
			// 		ease: 'power2.out',
			// 	});

			// 	// Animate opponent x to playerStartX
			// 	gsap.to(opponent, {
			// 		x: playerStartX,
			// 		duration: 12,
			// 		ease: 'power2.out',
			// 	});

			// 	// Animate player MPH to 0
			// 	gsap.to(
			// 		{},
			// 		{
			// 			duration: 10,
			// 			ease: 'power2.out',
			// 			onUpdate: function () {
			// 				setPlayerMPH((prev) => gsap.utils.interpolate(prev, 0, this.progress()));
			// 			},
			// 		}
			// 	);

			// 	// Animate opponent MPH to 0
			// 	gsap.to(
			// 		{},
			// 		{
			// 			duration: 10,
			// 			ease: 'power2.out',
			// 			onUpdate: function () {
			// 				setOpponentMPH((prev) => gsap.utils.interpolate(prev, 0, this.progress()));
			// 			},
			// 		}
			// 	);
			// } else {
			// Normal movement before pass
			if (GameState.can_move) {
				playerPosRef.current.x += moveSpeed * deltaTime;
				opponentPosRef.current.x -= moveSpeed * deltaTime;

				setPlayerMPH(moveSpeed);
				setOpponentMPH(moveSpeed);
			}
			// }

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

	return (
		<div>
			<Cameras
				sceneRef={sceneRef}
				playerRef={playerRef}
				opponentRef={opponentRef}
				playerPovCameraRef={playerPovCameraRef}
				sideViewCameraRef={sideViewCameraRef}
				camerasInitRef={camerasInitRef}
				povCameraAnchorRef={povCameraAnchorRef}
				playerPos={playerPos}
			/>
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
				povCameraAnchorRef={povCameraAnchorRef}
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
