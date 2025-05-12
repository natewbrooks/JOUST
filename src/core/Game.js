// core/Game.js
import * as THREE from 'three';
import gsap from 'gsap';

import { PlayerEntity } from './entities/PlayerEntity';
import { OpponentEntity } from './entities/OpponentEntity';
import { ArenaEntity } from './entities/environment/ArenaEntity';
import { CameraManager } from './cameras/CameraManager';
import { initGraphics } from '../utils/initGraphics';
import GameState from '../game-state';

import audioManager from '../utils/AudioManager';

class Game {
	constructor() {
		// Initialize THREE scene
		this.scene = new THREE.Scene();

		// Starting positions
		this.playerStartX = GameState.movementOptions.startPosX.right;
		this.opponentStartX = GameState.movementOptions.startPosX.left;
		this.moveSpeed = GameState.movementOptions.moveSpeed; // 20mph constant speed

		this.booPlayed = false;

		// Initialize positions
		this.playerPos = { x: this.playerStartX, y: 2, z: 0 };
		this.opponentPos = { x: this.opponentStartX, y: 2, z: 2 };

		this.horsesPassed = false;

		// Setup camera manager
		this.cameraManager = new CameraManager(this.scene);
		audioManager.attachToCamera(this.cameraManager.playerPovCamera);

		// Create arena entity
		this.arena = new ArenaEntity(this.scene, { x: 0, y: 0, z: 0 });

		// Create player entity - NOW RED TEAM
		this.player = new PlayerEntity(
			this.scene,
			this.playerPos,
			'red', // Changed from 'blue' to 'red'
			true,
			this.cameraManager.playerPovCamera,
			this.cameraManager.povCameraAnchorRef
		);
		GameState.setKnight(true, this.player);

		// Create opponent entity - NOW BLUE TEAM (was red)
		this.opponent = new OpponentEntity(this.scene, this.opponentPos, 'blue', false); // Changed from 'red' to 'blue'
		GameState.setKnight(false, this.opponent);
		// console.log(GameState.knights);

		// Game state
		this.hasAnimatedRef = false;

		// Animation frame tracking
		this.animationFrameId = null;
		this.lastTime = null;

		// For throttling state updates
		this.lastUpdateTime = 0;
		this.updateInterval = 1000 / 30; // 30fps

		// Subscribers for UI updates
		this.subscribers = [];

		// Round system state
		this.playerSlowdownSpeed = GameState.movementOptions.nearHalfwaySpeed;
		this.opponentSlowdownSpeed = GameState.movementOptions.nearHalfwaySpeed;
		this.playerWalkStartX = null; // Track where player started walking out
		this.opponentWalkStartX = null; // Track where opponent started walking out

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

			// Player position marker (red - changed from blue)
			this.playerMarker = createMarker(
				new THREE.Vector3(this.playerPos.x, this.playerPos.y, this.playerPos.z),
				0xff0000, // Changed to red
				'Player Position Marker'
			);

			// Opponent position marker (blue - changed from red)
			this.opponentMarker = createMarker(
				new THREE.Vector3(this.opponentPos.x, this.opponentPos.y, this.opponentPos.z),
				0x0000ff, // Changed to blue
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
					console.log('KEY L PRESSED');
				}
			});
		};

		if (GameState.debug) {
			// Create debug info and position display divs
			this.createDebugUI();
			this.createDebugHelpers();
		}

		// Store canvas element
		this.canvas = this.graphics.canvas;

		// Store initial start positions for easy reference
		this.leftStartX = GameState.movementOptions.startPosX.left;
		this.rightStartX = GameState.movementOptions.startPosX.right;

		// Set up event listeners for GameState events
		this.setupGameStateListeners();

		// Start game
		GameState.startBout();
		this.start();
	}

	// Set up event listeners for GameState events
	setupGameStateListeners() {
		// Listen for when we need to reset positions (swap)
		GameState.on('positionsReset', (data) => {
			if (data.swap) {
				this.swapZPositionsAndFlip();
				this.booPlayed = false;
			}
		});

		// Listen for bout completion
		GameState.on('boutCompleted', (data) => {
			console.log('Bout completed, preparing for next bout:', data.bout);
		});

		// Listen for game end
		GameState.on('gameEnd', (data) => {
			console.log('Game completed!', data);
			// You can add game end logic here
		});
	}

	createDebugUI() {
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

	checkRoundPositions(deltaTime) {
		// --- IDLE STATE ---
		if (!GameState.can_move) {
			if (this.player.horse.currentAnimation !== 'Idle') {
				this.player.horse.playAnimation('Idle');
			}
			if (this.opponent.horse.currentAnimation !== 'Idle') {
				this.opponent.horse.playAnimation('Idle');
			}
			return;
		}

		// --- MOVEMENT SETUP ---
		const playerMovingLeft = this.playerStartX > this.opponentStartX;
		const playerDirection = playerMovingLeft ? -1 : 1;

		const opponentMovingLeft = this.opponentStartX > this.playerStartX;
		const opponentDirection = opponentMovingLeft ? -1 : 1;

		const playerTargetX = this.opponentStartX;
		const opponentTargetX = this.playerStartX;

		const playerReachedOppositeEnd = playerMovingLeft
			? this.playerPos.x <= playerTargetX + 0.5
			: this.playerPos.x >= playerTargetX - 0.5;

		const opponentReachedOppositeEnd = opponentMovingLeft
			? this.opponentPos.x <= opponentTargetX + 0.5
			: this.opponentPos.x >= opponentTargetX - 0.5;

		// --- MARK AS REACHED END & SET WALK START ---
		if (playerReachedOppositeEnd && this.playerWalkStartX === null) {
			this.playerWalkStartX = this.playerPos.x;
			GameState.markPlayerReachedEnd(true);
		}
		if (opponentReachedOppositeEnd && this.opponentWalkStartX === null) {
			this.opponentWalkStartX = this.opponentPos.x;
			GameState.markPlayerReachedEnd(false);
		}

		// --- PLAYER MOVEMENT ---
		if (this.playerWalkStartX === null) {
			this.playerPos.x += this.moveSpeed * deltaTime * playerDirection;
		} else {
			this.playerPos.x += this.playerSlowdownSpeed * deltaTime * playerDirection;
			const walkDist = Math.abs(this.playerPos.x - this.playerWalkStartX);
			GameState.updateWalkDistance(true, walkDist);
		}

		// --- OPPONENT MOVEMENT ---
		if (this.opponentWalkStartX === null) {
			this.opponentPos.x += this.moveSpeed * deltaTime * opponentDirection;
		} else {
			this.opponentPos.x += this.opponentSlowdownSpeed * deltaTime * opponentDirection;
			const walkDist = Math.abs(this.opponentPos.x - this.opponentWalkStartX);
			GameState.updateWalkDistance(false, walkDist);
		}

		// --- ANIMATION STATE ---
		if (this.playerWalkStartX !== null) {
			if (this.player.horse.currentAnimation !== 'Walk') {
				this.player.horse.playAnimation('Walk');
			}
		} else {
			if (this.player.horse.currentAnimation !== 'Run') {
				this.player.horse.playAnimation('Run');
			}
		}

		if (this.opponentWalkStartX !== null) {
			if (this.opponent.horse.currentAnimation !== 'Walk') {
				this.opponent.horse.playAnimation('Walk');
			}
		} else {
			if (this.opponent.horse.currentAnimation !== 'Run') {
				this.opponent.horse.playAnimation('Run');
			}
		}
	}

	// Reset bout state for new bout
	resetBoutState() {
		this.playerWalkStartX = null;
		this.opponentWalkStartX = null;
		this.playerSlowdownSpeed = this.moveSpeed;
		this.opponentSlowdownSpeed = this.moveSpeed;
		this.horsesPassed = false;
		this.player.horse.playAnimation('Idle');
		this.opponent.horse.playAnimation('Idle');
	}

	swapZPositionsAndFlip() {
		// Reset bout state
		this.resetBoutState();

		// Store current Z positions
		const playerCurrentZ = this.playerPos.z;
		const opponentCurrentZ = this.opponentPos.z;

		// Store current starting X positions
		const playerCurrentStartX = this.playerStartX;
		const opponentCurrentStartX = this.opponentStartX;

		// Swap starting X positions
		this.playerStartX = opponentCurrentStartX;
		this.opponentStartX = playerCurrentStartX;

		// Set actual X positions to the new starting positions (snap/teleport)
		this.playerPos.x = this.playerStartX;
		this.opponentPos.x = this.opponentStartX;

		// Swap Z positions
		this.playerPos.z = opponentCurrentZ;
		this.opponentPos.z = playerCurrentZ;

		// Flip both entities
		if (this.player) {
			this.player.flip();
		}
		if (this.opponent) {
			this.opponent.flip();
		}

		console.log('Swapped positions and flipped sprites:', {
			playerStartX: this.playerStartX,
			opponentStartX: this.opponentStartX,
			playerPos: { x: this.playerPos.x, z: this.playerPos.z },
			opponentPos: { x: this.opponentPos.x, z: this.opponentPos.z },
			playerFlipped: this.player?.flipped,
			opponentFlipped: this.opponent?.flipped,
		});
	}

	animate(timestamp) {
		// console.log(GameState.currentBoutMetadata === null);
		if (!this.lastTime) this.lastTime = timestamp;
		const deltaTime = (timestamp - this.lastTime) / 1000; // Convert to seconds
		this.lastTime = timestamp;

		let currentBoutMetadata = GameState.getBoutMetadata(GameState.getBout());
		if (
			this.horsesPassed &&
			!this.booPlayed &&
			(currentBoutMetadata === null ||
				(currentBoutMetadata.red.pts_earned === 0 && currentBoutMetadata.blue.pts_earned === 0))
		) {
			audioManager.playBoo(0.3);
			this.booPlayed = true;
		}

		this.checkRoundPositions(deltaTime);

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

		// SLOW DOWN MOVEMENT IF DISTANCE IS CLOSE ENOUGH
		let ppos = new THREE.Vector3(this.playerPos.x, this.playerPos.y, this.playerPos.z);
		let opos = new THREE.Vector3(this.opponentPos.x, this.opponentPos.y, this.opponentPos.z);
		let dist = ppos.distanceTo(opos);

		// awk number but it accounts for horizontal dist
		if (dist <= 2.02) {
			this.horsesPassed = true;
		}

		// Use GSAP to smoothly animate the moveSpeed change
		if (dist < GameState.movementOptions.nearHalfwayDistance && currentBoutMetadata === null) {
			// Smoothly transition to slow speed
			gsap.to(this, {
				moveSpeed: GameState.movementOptions.nearHalfwaySpeed,
				duration: 0.4,
				ease: 'power2.out',
			});
		} else {
			// Smoothly transition to normal speed
			gsap.to(this, {
				moveSpeed: GameState.movementOptions.moveSpeed,
				duration: 1,
				ease: 'power2.out',
			});
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
			countdown: GameState.bout_countdown_timer,
			canMove: GameState.can_move,
		};

		this.subscribers.forEach((callback) => callback(gameState));
	}
}

// Create singleton instance
const gameInstance = new Game();
export default gameInstance;
