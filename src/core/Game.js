// core/Game.js
import * as THREE from 'three';
import { PlayerEntity } from './entities/PlayerEntity';
import { OpponentEntity } from './entities/OpponentEntity';
import { ArenaEntity } from './entities/environment/ArenaEntity';
import { CameraManager } from './cameras/CameraManager';
import { initGraphics } from '../utils/initGraphics';
import GameState from '../game-state';

class Game {
	constructor() {
		// Initialize THREE scene
		this.scene = new THREE.Scene();

		// Starting positions
		this.playerStartX = -18;
		this.opponentStartX = 18;
		this.moveSpeed = 7; // 20mph constant speed

		// Initialize positions
		this.playerPos = { x: this.playerStartX, y: 2.5, z: -0.5 };
		this.opponentPos = { x: this.opponentStartX, y: 2.5, z: 1.5 };

		// Setup camera manager
		this.cameraManager = new CameraManager(this.scene);

		// Create arena entity
		this.arena = new ArenaEntity(this.scene, { x: 0, y: 0, z: 0 });

		// Create player entity
		this.player = new PlayerEntity(
			this.scene,
			this.playerPos,
			'blue',
			true,
			this.cameraManager.playerPovCamera,
			this.cameraManager.povCameraAnchorRef
		);

		// Create opponent entity
		this.opponent = new OpponentEntity(this.scene, this.opponentPos, 'red', false);

		// Game state
		this.horsesPassedRef = false;
		this.hasAnimatedRef = false;

		// Animation frame tracking
		this.animationFrameId = null;
		this.lastTime = null;

		// For throttling state updates
		this.lastUpdateTime = 0;
		this.updateInterval = 1000 / 30; // 30fps

		// Subscribers for UI updates
		this.subscribers = [];

		// Initialize graphics
		this.graphics = initGraphics(
			this.scene,
			this.cameraManager, // Pass the entire camera manager instead of just the camera
			this.cameraManager.sideViewCamera
		);

		console.log('Side camera frustum:', {
			left: this.cameraManager.sideViewCamera.left,
			right: this.cameraManager.sideViewCamera.right,
			top: this.cameraManager.sideViewCamera.top,
			bottom: this.cameraManager.sideViewCamera.bottom,
			near: this.cameraManager.sideViewCamera.near,
			far: this.cameraManager.sideViewCamera.far,
		});

		console.log('POV camera frustum:', {
			fov: this.cameraManager.playerPovCamera.fov,
			near: this.cameraManager.playerPovCamera.near,
			far: this.cameraManager.playerPovCamera.far,
		});

		this.createDebugHelpers = () => {
			// Add position markers for important locations
			const createMarker = (position, color, name) => {
				const marker = new THREE.Mesh(
					new THREE.SphereGeometry(0.5, 8, 8),
					new THREE.MeshBasicMaterial({ color, wireframe: true })
				);
				marker.position.copy(position);
				marker.name = name;
				this.scene.add(marker);
				return marker;
			};

			// Player position marker (blue)
			this.playerMarker = createMarker(
				new THREE.Vector3(this.playerPos.x, this.playerPos.y, this.playerPos.z),
				0x0000ff,
				'Player Position Marker'
			);

			// Opponent position marker (red)
			this.opponentMarker = createMarker(
				new THREE.Vector3(this.opponentPos.x, this.opponentPos.y, this.opponentPos.z),
				0xff0000,
				'Opponent Position Marker'
			);

			// Origin marker (yellow)
			this.originMarker = createMarker(new THREE.Vector3(0, 0, 0), 0xffff00, 'Origin Marker');

			// Add label to display coordinates
			this.createDebugText = (text, position, color = 0xffffff) => {
				// In a real implementation, you would use HTML overlay or a library like three-spritetext
				console.log(`Debug Text: ${text} at position ${position.x}, ${position.y}, ${position.z}`);
			};

			// Log positions of all important objects
			this.logSceneObjects = () => {
				console.log('=== SCENE OBJECT POSITIONS ===');
				this.scene.traverse((obj) => {
					if (obj.name && obj.name !== '') {
						console.log(`${obj.name}: ${obj.position.x}, ${obj.position.y}, ${obj.position.z}`);

						// If object has parent, log parent-relative position
						if (obj.parent && obj.parent !== this.scene) {
							const worldPos = new THREE.Vector3();
							obj.getWorldPosition(worldPos);
							console.log(`  World position: ${worldPos.x}, ${worldPos.y}, ${worldPos.z}`);
						}
					}
				});
			};

			// Add a key handler for debugging
			window.addEventListener('keydown', (e) => {
				// Press 'L' to log all scene objects
				if (e.code === 'KeyL') {
					// this.logSceneObjects();
					console.log('KEY L PRESSED');
				}
			});
		};

		if (GameState.debug) {
			// Create a debug info div
			const debugInfo = document.createElement('div');
			debugInfo.id = 'debug-info';
			debugInfo.style.position = 'absolute';
			debugInfo.style.top = '10px';
			debugInfo.style.left = '10px';
			debugInfo.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
			debugInfo.style.color = 'white';
			debugInfo.style.padding = '10px';
			debugInfo.style.fontFamily = 'monospace';
			debugInfo.style.fontSize = '12px';
			debugInfo.style.zIndex = '1000';
			debugInfo.style.pointerEvents = 'none'; // Don't block mouse events
			debugInfo.innerHTML =
				'DEBUG MODE: Arrow keys = rotate, WASD = move, Q/E = down/up, Tab = toggle camera';
			document.body.appendChild(debugInfo);

			// Create position display
			const positionDisplay = document.createElement('div');
			positionDisplay.id = 'position-display';
			positionDisplay.style.position = 'absolute';
			positionDisplay.style.bottom = '10px';
			positionDisplay.style.left = '10px';
			positionDisplay.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
			positionDisplay.style.color = 'white';
			positionDisplay.style.padding = '10px';
			positionDisplay.style.fontFamily = 'monospace';
			positionDisplay.style.fontSize = '12px';
			positionDisplay.style.zIndex = '1000';
			positionDisplay.style.pointerEvents = 'none';
			document.body.appendChild(positionDisplay);

			// Update position display in animation loop
			setInterval(() => {
				if (this.cameraManager.isDebugCameraActive && this.cameraManager.debugCamera) {
					const pos = this.cameraManager.debugCamera.position;
					const rot = this.cameraManager.debugCamera.rotation;
					positionDisplay.innerHTML =
						`Pos: ${pos.x.toFixed(2)}, ${pos.y.toFixed(2)}, ${pos.z.toFixed(2)}<br>` +
						`Rot: ${((rot.x * 180) / Math.PI).toFixed(2)}°, ${((rot.y * 180) / Math.PI).toFixed(
							2
						)}°, ${((rot.z * 180) / Math.PI).toFixed(2)}°`;
				} else {
					positionDisplay.innerHTML = 'Debug camera inactive';
				}
			}, 100);
		}

		if (GameState.debug) {
			this.createDebugHelpers();

			// // Log initial positions
			// setTimeout(() => {
			// 	console.log('Initial Positions:');
			// 	this.logSceneObjects();
			// }, 2000); // Wait for models to load
		}

		// Store canvas element
		this.canvas = this.graphics.canvas;

		// Start game
		GameState.startBout();
		this.start();
	}

	start() {
		this.animate(0);
	}

	stop() {
		if (this.animationFrameId) {
			cancelAnimationFrame(this.animationFrameId);
			this.animationFrameId = null;
		}
	}

	// Clean up all resources
	cleanup() {
		this.stop();

		// Dispose graphics
		if (this.graphics && this.graphics.dispose) {
			this.graphics.dispose();
		}

		// Dispose entities
		if (this.player) {
			this.player.dispose();
		}

		if (this.opponent) {
			this.opponent.dispose();
		}

		if (this.arena) {
			this.arena.dispose();
		}

		if (this.cameraManager) {
			this.cameraManager.dispose();
		}

		// Clear subscribers
		this.subscribers = [];
	}

	animate(timestamp) {
		if (!this.lastTime) this.lastTime = timestamp;
		const deltaTime = (timestamp - this.lastTime) / 1000; // Convert to seconds
		this.lastTime = timestamp;

		// Check if horses passed
		this.horsesPassedRef = this.playerPos.x >= this.opponentPos.x;

		// Move characters if allowed
		if (GameState.can_move) {
			this.playerPos.x += this.moveSpeed * deltaTime;
			this.opponentPos.x -= this.moveSpeed * deltaTime;
		}

		if (GameState.debug) {
			// Update position markers
			if (this.playerMarker) {
				this.playerMarker.position.set(this.playerPos.x, this.playerPos.y, this.playerPos.z);
			}
			if (this.opponentMarker) {
				this.opponentMarker.position.set(
					this.opponentPos.x,
					this.opponentPos.y,
					this.opponentPos.z
				);
			}
		}

		// Update entities
		this.player.update(deltaTime, { ...this.playerPos });
		this.opponent.update(deltaTime, { ...this.opponentPos });
		this.cameraManager.update(deltaTime, this.player.model);

		// Render the scene
		if (this.graphics && this.graphics.render) {
			this.graphics.render();
		}

		// Throttle UI updates
		const now = timestamp;
		if (now - this.lastUpdateTime > this.updateInterval) {
			this.lastUpdateTime = now;
			this.notifySubscribers();
		}

		// Continue animation loop
		this.animationFrameId = requestAnimationFrame(this.animate.bind(this));
	}

	// Subscribe to game state updates (for UI)
	subscribe(callback) {
		this.subscribers.push(callback);
		return () => {
			this.subscribers = this.subscribers.filter((sub) => sub !== callback);
		};
	}

	// Notify all subscribers of game state updates
	notifySubscribers() {
		const gameState = {
			playerPos: { ...this.playerPos },
			opponentPos: { ...this.opponentPos },
			playerMPH: this.moveSpeed,
			opponentMPH: this.moveSpeed,
			countdown: GameState.round_countdown_timer,
			canMove: GameState.can_move,
		};

		this.subscribers.forEach((callback) => callback(gameState));
	}
}

// Create singleton instance
const gameInstance = new Game();
export default gameInstance;
