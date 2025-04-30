import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import gsap from 'gsap';

import { setSideViewCamera, setPovCamera } from '../../../utils/cameraTransitions.jsx';
import { initGraphics } from '../../../utils/initGraphics.jsx';

import GameState from '../../../game-state.js';

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
		const scene = sceneRef.current;
		let debugCube;

		if (povCameraAnchorRef.current && playerRef.current) {
			setPovCamera(playerPovCameraRef.current, camerasInitRef.current, povCameraAnchorRef.current);

			if (GameState.debug) {
				const cubeGeometry = new THREE.BoxGeometry(0.2, 0.2, 0.2);
				const cubeMaterial = new THREE.MeshBasicMaterial({
					color: 0xff0000,
					wireframe: true,
				});
				debugCube = new THREE.Mesh(cubeGeometry, cubeMaterial);
				povCameraAnchorRef.current.add(debugCube);
			}

			const update = () => {
				if (GameState.debug && debugCube && povCameraAnchorRef.current) {
					debugCube.position.copy(playerPovCameraRef.current.position);
				}
				requestAnimationFrame(update);
			};
			update();
		}

		return () => {
			if (debugCube) {
				scene.remove(debugCube);
				debugCube.geometry.dispose();
				debugCube.material.dispose();
			}
		};
	}, [playerPos]);

	return <></>;
}

export default Cameras;
