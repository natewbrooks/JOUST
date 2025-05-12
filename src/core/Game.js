// core/Game.js
import * as THREE from 'three';
import gsap from 'gsap';

import { PlayerEntity } from './entities/PlayerEntity';
import { OpponentEntity } from './entities/OpponentEntity';
import { ArenaEntity } from './entities/environment/ArenaEntity';
import { CameraManager } from './cameras/CameraManager';
import { UIManager } from '../utils/UIManager';
import { initGraphics } from '../utils/initGraphics';
import gameStateManager from '../GameStateManager';

import audioManager from '../utils/AudioManager';

class Game {
	constructor() {
		// Initialize THREE scene
		this.scene = new THREE.Scene();

		// Starting positions
		this.playerStartX = gameStateManager.movementOptions.startPosX.right;
		this.opponentStartX = gameStateManager.movementOptions.startPosX.left;
		this.moveSpeed = gameStateManager.movementOptions.moveSpeed; // 20mph constant speed

		// Time control for slow-motion effect
		this.timeScale = 1.0;
		this.targetTimeScale = 1.0;

		this.booPlayed = false;

		// Initialize positions
		this.playerPos = { x: this.playerStartX, y: 2, z: 0 };
		this.opponentPos = { x: this.opponentStartX, y: 2, z: 2 };

		this.horsesPassed = false;

		// Setup camera manager
		this.cameraManager = new CameraManager(this.scene);
		this.uiManager = new UIManager();
		audioManager.attachToCamera(this.cameraManager.playerPovCamera);

		// Create arena entity
		this.arena = new ArenaEntity(this.scene, { x: 0, y: 0, z: 0 });

		const playerTeam = Math.random() < 0.5 ? 'red' : 'blue';
		const opponentTeam = playerTeam === 'red' ? 'blue' : 'red';

		// Create player entity - NOW RED TEAM
		this.player = new PlayerEntity(
			this.scene,
			this.playerPos,
			playerTeam,
			true,
			this.cameraManager.playerPovCamera,
			this.cameraManager.povCameraAnchorRef
		);
		gameStateManager.setKnight(true, this.player);

		// Create opponent entity - NOW BLUE TEAM (was red)
		this.opponent = new OpponentEntity(this.scene, this.opponentPos, opponentTeam, false); // Changed from 'red' to 'blue'
		gameStateManager.setKnight(false, this.opponent);
		// console.log(gameStateManager.knights);

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

		// Track walking state
		this.playerWalking = false;
		this.opponentWalking = false;
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
					this.logSceneObjects();
					console.log('KEY L PRESSED');
				}
			});
		};

		if (gameStateManager.debug) {
			// Create debug info and position display divs
			this.createDebugUI();
			this.createDebugHelpers();
		}

		// Store canvas element
		this.canvas = this.graphics.canvas;

		// Store initial start positions for easy reference
		this.leftStartX = gameStateManager.movementOptions.startPosX.left;
		this.rightStartX = gameStateManager.movementOptions.startPosX.right;

		// Set up event listeners for GameState events
		this.setupGameStateListeners();
		this.setupGameResetListener();

		// Start game
		gameStateManager.startBout();
		this.start();
	}

	// Set up event listeners for GameState events
	setupGameStateListeners() {
		// Listen for when we need to reset positions (swap)
		// gameStateManager.on('positionsReset', (data) => {
		// 	if (data.swap) {
		// 	}
		// });

		gameStateManager.on('transitionMidpoint', (data) => {
			this.swapZPositionsAndFlip();
			this.booPlayed = false;
		});

		// Listen for bout completion
		gameStateManager.on('boutCompleted', (data) => {
			console.log('Bout completed, preparing for next bout:', data.bout);
			// gameStateManager.playScreenTransition();
		});

		// Listen for game end
		gameStateManager.on('gameEnd', (data) => {
			// console.log('Game completed!', data);
			audioManager.stopMusic();

			// Stop horses from moving
			this.playerWalking = false;
			this.opponentWalking = false;

			// Transition to a celebratory camera angle
			if (this.cameraManager) {
				// Move to a wider angle to show both knights
				this.cameraManager.transitionToGameEndView();
				this.playerPos = { x: -1, y: 2, z: 4 };
				this.opponentPos = { x: 1, y: 2, z: 4 };
				this.player.faceKing();
				this.opponent.faceKing();
			}
		});

		gameStateManager.on('winnerRevealed', (data) => {
			// Play victory sound based on winner
			if (data.winner === this.player.team) {
				// won
				audioManager.playSound('victory', { volume: 0.7 });
				audioManager.playSound('trumpet', { volume: 0.1 });
				audioManager.playSound('cheer', { loop: true, volume: 0.5 });
			} else if (data.winner === 'tie') {
				// tied
				audioManager.playSound('tie', { volume: 0.7 });
				audioManager.playSound('boo', { volume: 0.3 });
			} else {
				// lost
				audioManager.playSound('defeat', { volume: 0.8 });
				audioManager.playSound('cheer', { loop: true, volume: 0.2 });
			}
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
		// Update position display in animation loop
		setInterval(() => {
			if (this.cameraManager.isDebugCameraActive && this.cameraManager.debugCamera) {
				// Create a temporary Vector3 to store the world position
				const worldPos = new THREE.Vector3();
				// Get the world position of the camera
				this.cameraManager.debugCamera.getWorldPosition(worldPos);

				const rot = this.cameraManager.debugCamera.rotation;
				positionDisplay.innerHTML =
					`World Pos: ${worldPos.x.toFixed(2)}, ${worldPos.y.toFixed(2)}, ${worldPos.z.toFixed(
						2
					)}<br>` +
					`Local Pos: ${this.cameraManager.debugCamera.position.x.toFixed(
						2
					)}, ${this.cameraManager.debugCamera.position.y.toFixed(
						2
					)}, ${this.cameraManager.debugCamera.position.z.toFixed(2)}<br>` +
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
		if (!gameStateManager.can_move) {
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
		if (playerReachedOppositeEnd && !this.playerWalking) {
			this.playerWalking = true;
			this.playerWalkStartX = this.playerPos.x;
			gameStateManager.markPlayerReachedEnd(true);
		}

		if (opponentReachedOppositeEnd && !this.opponentWalking) {
			this.opponentWalking = true;
			this.opponentWalkStartX = this.opponentPos.x;
			gameStateManager.markPlayerReachedEnd(false);
		}

		// --- PLAYER MOVEMENT ---
		if (!this.playerWalking) {
			// Regular movement at normal speed
			this.playerPos.x += this.moveSpeed * deltaTime * playerDirection;
		} else {
			// Walking movement at constant walk speed, unaffected by time scale
			const walkSpeed = gameStateManager.movementOptions.horseWalkSpeed;
			this.playerPos.x += (walkSpeed * deltaTime * playerDirection) / this.timeScale;

			const walkDist = Math.abs(this.playerPos.x - this.playerWalkStartX);
			gameStateManager.updateWalkDistance(true, walkDist);
		}

		// --- OPPONENT MOVEMENT ---
		if (!this.opponentWalking) {
			// Regular movement at normal speed
			this.opponentPos.x += this.moveSpeed * deltaTime * opponentDirection;
		} else {
			// Walking movement at constant walk speed, unaffected by time scale
			const walkSpeed = gameStateManager.movementOptions.horseWalkSpeed;
			this.opponentPos.x += (walkSpeed * deltaTime * opponentDirection) / this.timeScale;

			const walkDist = Math.abs(this.opponentPos.x - this.opponentWalkStartX);
			gameStateManager.updateWalkDistance(false, walkDist);
		}

		// --- ANIMATION STATE ---
		if (this.playerWalking) {
			if (this.player.horse.currentAnimation !== 'Walk') {
				this.player.horse.playAnimation('Walk');
			}
		} else {
			if (this.player.horse.currentAnimation !== 'Run') {
				this.player.horse.playAnimation('Run');
			}
		}

		if (this.opponentWalking) {
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
		this.playerWalking = false;
		this.opponentWalking = false;
		this.playerWalkStartX = null;
		this.opponentWalkStartX = null;
		this.timeScale = 1.0;
		this.targetTimeScale = 1.0;
		this.horsesPassed = false;
		this.player.horse.playAnimation('Idle');
		this.opponent.horse.playAnimation('Idle');
	}

	resetGame() {
		// Stop the current animation loop
		this.stop();

		// Reset time control
		this.timeScale = 1.0;
		this.targetTimeScale = 1.0;
		this.booPlayed = false;
		this.horsesPassed = false;

		// Reset walking states
		this.playerWalking = false;
		this.opponentWalking = false;
		this.playerWalkStartX = null;
		this.opponentWalkStartX = null;

		// Reset player/opponent positions
		this.playerStartX = gameStateManager.movementOptions.startPosX.right;
		this.opponentStartX = gameStateManager.movementOptions.startPosX.left;

		this.playerPos = { x: this.playerStartX, y: 2, z: 0 };
		this.opponentPos = { x: this.opponentStartX, y: 2, z: 2 };

		// Re-randomize team assignments
		const playerTeam = Math.random() < 0.5 ? 'red' : 'blue';
		const opponentTeam = playerTeam === 'red' ? 'blue' : 'red';

		// Reset entities with new teams
		if (this.player) {
			// Use setTeam instead of directly setting team property
			this.player.setTeam(playerTeam);
			this.player.resetPosition(this.playerPos);
			this.player.horse.playAnimation('Idle');

			// Reset player direction based on new starting position
			if (this.player.flipped !== this.playerStartX < 0) {
				this.player.flip();
			}
		}

		if (this.opponent) {
			// Use setTeam instead of directly setting team property
			this.opponent.setTeam(opponentTeam);
			this.opponent.resetPosition(this.opponentPos);
			this.opponent.horse.playAnimation('Idle');

			// Reset opponent direction based on new starting position
			if (this.opponent.flipped !== this.opponentStartX < 0) {
				this.opponent.flip();
			}
		}

		// Update knight references in GameStateManager
		gameStateManager.setKnight(true, this.player);
		gameStateManager.setKnight(false, this.opponent);

		// Reset camera
		if (this.cameraManager) {
			this.cameraManager.resetCamera();
		}

		// Force UI update to reflect the reset scores
		this.notifySubscribers();

		// Restart the animation loop
		this.start();
	}

	// Set up listener for game reset
	setupGameResetListener() {
		gameStateManager.on('gameReset', () => {
			console.log('Resetting game completely');
			this.resetGame();
		});
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
		// Calculate raw deltaTime first
		if (!this.lastTime) this.lastTime = timestamp;
		const rawDeltaTime = (timestamp - this.lastTime) / 1000; // Convert to seconds
		this.lastTime = timestamp;

		if (gameStateManager.paused) {
			// When paused: still render the scene but don't update game state
			// This ensures animations freeze but music keeps playing

			// Still update UI to show paused state
			this.uiManager.update(0);

			// Render the scene (without updates)
			if (this.graphics && this.graphics.render) {
				this.graphics.render();
			}

			// Continue animation loop
			this.animationFrameId = requestAnimationFrame(this.animate.bind(this));
			return;
		}
		// Smoothly interpolate timeScale towards targetTimeScale
		this.timeScale = gsap.utils.interpolate(
			this.timeScale,
			this.targetTimeScale,
			Math.min(1, rawDeltaTime * 5) // Smooth transition over 0.2 seconds
		);

		// Calculate adjusted deltaTime with the timeScale
		const deltaTime = rawDeltaTime * this.timeScale;

		let currentBoutMetadata = gameStateManager.getBoutMetadata(gameStateManager.getBout());
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

		if (gameStateManager.debug) {
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

		// CHECK DISTANCE AND HANDLE TIME SLOWDOWN
		let ppos = new THREE.Vector3(this.playerPos.x, this.playerPos.y, this.playerPos.z);
		let opos = new THREE.Vector3(this.opponentPos.x, this.opponentPos.y, this.opponentPos.z);
		let dist = ppos.distanceTo(opos);

		// Handle time slowdown based on distance
		if (dist <= 2.02) {
			this.horsesPassed = true;
		}

		// Decide when to trigger time slowdown and when to return to normal time
		if (
			dist < gameStateManager.movementOptions.nearHalfwayDistance &&
			currentBoutMetadata === null &&
			!this.horsesPassed
		) {
			// Slowdown when approaching midway point
			this.targetTimeScale = gameStateManager.movementOptions.timeSlowdownFactor;

			// Adjust animation speeds to compensate for time slowdown
			if (this.player.horse && this.player.horse.mixer) {
				this.player.horse.mixer.timeScale = 1 / this.timeScale;
			}
			if (this.opponent.horse && this.opponent.horse.mixer) {
				this.opponent.horse.mixer.timeScale = 1 / this.timeScale;
			}
		} else {
			// Return to normal time
			this.targetTimeScale = 1.0;

			// Reset animation speeds
			if (this.player.horse && this.player.horse.mixer) {
				this.player.horse.mixer.timeScale = 1.0;
			}
			if (this.opponent.horse && this.opponent.horse.mixer) {
				this.opponent.horse.mixer.timeScale = 1.0;
			}
		}

		// Update entities - passing the raw deltaTime for animations
		this.player.update(rawDeltaTime, { ...this.playerPos });
		this.opponent.update(rawDeltaTime, { ...this.opponentPos });
		this.cameraManager.update(deltaTime, this.player.model);
		this.uiManager.update(deltaTime);

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
			countdown: gameStateManager.bout_countdown_timer,
			canMove: gameStateManager.can_move,
			timeScale: this.timeScale,
		};

		this.subscribers.forEach((callback) => callback(gameState));
	}
}

// Create singleton instance
const gameInstance = new Game();
export default gameInstance;
