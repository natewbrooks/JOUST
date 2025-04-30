import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import gsap from 'gsap';

import { setSideViewCamera, setPovCamera } from '../../../utils/cameraTransitions.jsx';
import { initGraphics } from '../../../utils/initGraphics.jsx';

// import GameState from './game-state.js';

function Cameras({
	sceneRef,
	playerRef,
	opponentRef,
	playerPovCameraRef,
	sideViewCameraRef,
	camerasInitRef,
	povCameraAnchorRef,
	playerPos,
}) {
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

		// Pass camera refs up to parent
		sideViewCameraRef.current = orthoCamera;
		playerPovCameraRef.current = perspectiveCamera;

		const { dispose } = initGraphics(scene, playerPovCameraRef, sideViewCameraRef);
		return () => dispose();
	}, []);

	useEffect(() => {
		if (povCameraAnchorRef.current && playerRef.current && opponentRef.current) {
			setPovCamera(
				playerPovCameraRef.current,
				// playerRef.current.position,
				// opponentRef.current.position,
				camerasInitRef.current,
				povCameraAnchorRef.current
				// horsesPassedRef.current
			);
		}
	}, [playerPos]);

	return <></>;
}

export default Cameras;
