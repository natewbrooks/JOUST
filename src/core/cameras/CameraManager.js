// core/cameras/CameraManager.js
import * as THREE from 'three';
import { setSideViewCamera, setPovCamera, cleanupPovCamera } from '../../utils/cameraTransitions';
import GameState from '../../game-state';
import gsap from 'gsap';

export class CameraManager {
	constructor(scene) {
		this.scene = scene;

		this.horsesPassed = false;

		// Create cameras
		this.playerPovCamera = new THREE.PerspectiveCamera(
			100,
			window.innerWidth / window.innerHeight,
			0.4,
			1000
		);

		const zoom = 150;
		this.sideViewCamera = new THREE.OrthographicCamera(
			-window.innerWidth / zoom,
			window.innerWidth / zoom,
			window.innerHeight / zoom,
			-window.innerHeight / zoom,
			20,
			1000
		);

		// Create debug camera (free-floating camera for debugging)
		this.debugCamera = new THREE.PerspectiveCamera(
			75,
			window.innerWidth / window.innerHeight,
			0.1,
			1000
		);
		this.debugCamera.position.set(0, 5, -20); // Initial position
		this.debugCamera.lookAt(0, 5, 0);

		this.isDebugCameraActive = false;

		// Keyboard state for debug camera movement
		this.keys = {
			ArrowUp: false,
			ArrowDown: false,
			ArrowLeft: false,
			ArrowRight: false,
			KeyW: false,
			KeyS: false,
			KeyA: false,
			KeyD: false,
			KeyQ: false,
			KeyE: false,
		};

		// Debug camera movement settings
		this.debugCameraSpeed = 4;
		this.debugCameraRotationSpeed = 0.002;

		// Setup debug camera controls
		this.setupDebugCameraControls();

		// Camera initialization state
		this.camerasInitRef = false;
		this.povCameraAnchorRef = { current: null };

		// Set initial side view camera position
		setSideViewCamera(this.sideViewCamera, {
			distance: 25,
			height: 4,
			zoom: 60,
		});

		// Debug elements
		this.debugCube = null;

		console.log('Side view camera position:', this.sideViewCamera.position);
		console.log('POV camera position:', this.playerPovCamera.position);
		console.log('Debug camera position:', this.debugCamera.position);

		GameState.on('pointsChanged', () => {
			gsap.to(this.sideViewCamera, {
				zoom: 1,
				duration: 0.5,
				ease: 'power2.out',
				onUpdate: () => this.sideViewCamera.updateProjectionMatrix(),
			});
		});

		// Make sure side camera is looking at the center of the scene
		// this.sideViewCamera.lookAt(0, 0, 0);
	}

	setupDebugCameraControls() {
		// Keyboard event listeners for debug camera movement
		const onKeyDown = (e) => {
			if (this.keys.hasOwnProperty(e.code)) {
				this.keys[e.code] = true;
			}

			// Only allow toggling debug camera if GameState.debug is true
			if (e.code === 'Tab' && GameState.debug) {
				e.preventDefault(); // Prevent default tab behavior
				this.isDebugCameraActive = !this.isDebugCameraActive;
				console.log('Debug camera active:', this.isDebugCameraActive);
			}
		};

		const onKeyUp = (e) => {
			if (this.keys.hasOwnProperty(e.code)) {
				this.keys[e.code] = false;
			}
		};

		window.addEventListener('keydown', onKeyDown);
		window.addEventListener('keyup', onKeyUp);

		// Store cleanup function
		this.cleanupDebugControls = () => {
			window.removeEventListener('keydown', onKeyDown);
			window.removeEventListener('keyup', onKeyUp);
		};
	}

	updateDebugCamera(deltaTime) {
		if (!this.debugCamera) return;

		// Speed based on deltaTime for consistent movement
		const moveSpeed = this.debugCameraSpeed * deltaTime;
		const rotateSpeed = this.debugCameraRotationSpeed * 10; // Increased for better rotation

		// Get camera's forward, right, and up vectors
		const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.debugCamera.quaternion);
		const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.debugCamera.quaternion);
		const up = new THREE.Vector3(0, 1, 0);

		// WASD keys control movement
		if (this.keys.KeyW) {
			this.debugCamera.position.addScaledVector(forward, moveSpeed);
		}
		if (this.keys.KeyS) {
			this.debugCamera.position.addScaledVector(forward, -moveSpeed);
		}
		if (this.keys.KeyA) {
			this.debugCamera.position.addScaledVector(right, -moveSpeed);
		}
		if (this.keys.KeyD) {
			this.debugCamera.position.addScaledVector(right, moveSpeed);
		}
		if (this.keys.KeyQ) {
			this.debugCamera.position.addScaledVector(up, -moveSpeed);
		}
		if (this.keys.KeyE) {
			this.debugCamera.position.addScaledVector(up, moveSpeed);
		}

		// Arrow keys control rotation
		if (this.keys.ArrowUp) {
			this.debugCamera.rotateX(rotateSpeed); // Look up
		}
		if (this.keys.ArrowDown) {
			this.debugCamera.rotateX(-rotateSpeed); // Look down
		}
		if (this.keys.ArrowLeft) {
			this.debugCamera.rotateY(rotateSpeed); // Look left
		}
		if (this.keys.ArrowRight) {
			this.debugCamera.rotateY(-rotateSpeed); // Look right
		}

		// // Log camera info occasionally for debugging
		// if (Math.random() < 0.005) {
		// 	console.log('Debug camera position:', this.debugCamera.position);
		// 	console.log('Debug camera rotation:', {
		// 		x: this.debugCamera.rotation.x * (180 / Math.PI),
		// 		y: this.debugCamera.rotation.y * (180 / Math.PI),
		// 		z: this.debugCamera.rotation.z * (180 / Math.PI),
		// 	});
		// }
	}

	updateSideViewCamera(deltaTime, playerModel) {
		if (!this.camerasInitRef || !playerModel) return;

		const playerX = playerModel.position.x;
		const playerToOrigin = Math.abs(playerX);

		// Define target states based on proximity
		const isClose =
			playerToOrigin <= GameState.movementOptions.nearHalfwayDistance && !this.horsesPassed;

		const targetZoom = isClose ? 4 : 1;
		const targetY = isClose ? 2.5 : 4;
		const zoomDuration = isClose ? 8 : 0.5;
		const yDuration = isClose ? 5 : 0.5;

		if (playerToOrigin <= 0.05) {
			this.horsesPassed = true;
		}

		if (this.sideViewCamera.zoom !== targetZoom) {
			// Only animate if values actually need to change
			gsap.to(this.sideViewCamera, {
				zoom: targetZoom,
				duration: zoomDuration,
				ease: 'power2.out',
				onUpdate: () => this.sideViewCamera.updateProjectionMatrix(),
			});
		}

		if (this.sideViewCamera.position.y !== targetY) {
			gsap.to(this.sideViewCamera.position, {
				y: targetY,
				duration: yDuration,
				ease: 'power2.out',
			});
		}
	}

	update(deltaTime, playerModel) {
		// Update debug camera movement if active
		if (this.isDebugCameraActive) {
			this.updateDebugCamera(deltaTime);
		}

		if (this.sideViewCamera) {
			this.updateSideViewCamera(deltaTime, playerModel);
		}

		// Update POV camera if we have a valid anchor
		if (this.povCameraAnchorRef.current) {
			// Make sure POV camera is attached to the anchor
			if (this.playerPovCamera && !this.camerasInitRef) {
				setPovCamera(this.playerPovCamera, this.camerasInitRef, this.povCameraAnchorRef.current);
				this.camerasInitRef = true;
			}

			// Create debug visualization if needed
			if (GameState.debug && !this.debugCube) {
				const cubeGeometry = new THREE.BoxGeometry(0.2, 0.2, 0.2);
				const cubeMaterial = new THREE.MeshBasicMaterial({
					color: 0xff0000,
					wireframe: true,
				});
				this.debugCube = new THREE.Mesh(cubeGeometry, cubeMaterial);
				this.povCameraAnchorRef.current.add(this.debugCube);
			}

			// Update debug cube position
			if (GameState.debug && this.debugCube) {
				this.debugCube.position.copy(this.playerPovCamera.position);
			}
		}

		GameState.on('positionsReset', (data) => {
			if (data.swap) {
				this.horsesPassed = false;
			}
		});
	}

	setPovCameraAnchor(anchor) {
		this.povCameraAnchorRef.current = anchor;

		if (this.povCameraAnchorRef.current && this.playerPovCamera) {
			setPovCamera(this.playerPovCamera, this.camerasInitRef, this.povCameraAnchorRef.current);
			this.camerasInitRef = true;
		}
	}

	// Get the active camera for rendering
	getActiveCamera() {
		if (this.isDebugCameraActive) {
			return this.debugCamera;
		}
		return this.playerPovCamera;
	}

	dispose() {
		// Clean up event listeners for debug camera
		if (this.cleanupDebugControls) {
			this.cleanupDebugControls();
		}

		cleanupPovCamera();
		if (this.debugCube) {
			this.debugCube.parent.remove(this.debugCube);
			this.debugCube.geometry.dispose();
			this.debugCube.material.dispose();
			this.debugCube = null;
		}
	}
}
