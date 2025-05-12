import gsap from 'gsap';
import audioManager from './utils/AudioManager';

// game-state.js
const GameState = (() => {
	let debug = true;
	let use_shaders = false;
	let game_started = false;
	let bout_countdown_timer = 3;
	let can_move = false;
	let current_bout = 0;
	let game_start_time = null;

	const MAX_BOUTS = 8;

	let knights = {
		player: null,
		opponent: null,
	};

	let movementOptions = {
		moveSpeed: 7, // 7
		nearHalfwayDistance: 6, // how far distance you need to trigger zoom
		nearHalfwaySpeed: 3, //3
		horseWalkSpeed: 0.5,
		startPosX: {
			left: 20,
			right: -20,
		},
	};

	let countdownInterval = null;
	let boutInProgress = false;

	// Event listeners - added new events for bout management
	const listeners = {
		countdown: [],
		boutStart: [],
		boutEnd: [],
		gameEnd: [],
		stateChange: [],
		pointsChanged: [],
		transitionMidpoint: [],
		boutDataChanged: [], // New event for any bout data change
		boutCompleted: [], // When both players finish their bout
		positionsReset: [], // When positions need to be reset for next bout
	};

	const points = {
		red: 0,
		blue: 0,
	};

	const bout_metadata = {};

	// Data for tracking bout completion
	const boutCompletionData = {
		playerReachedEnd: false,
		opponentReachedEnd: false,
		playerWalkedDistance: 0,
		opponentWalkedDistance: 10,
		requiredWalkDistance: 10,
	};

	const setBoutMetadata = (bout, team, data) => {
		if (!bout_metadata[bout]) {
			bout_metadata[bout] = {
				red: { part_hit: null, pts_earned: 0, mph_on_contact: 0 },
				blue: { part_hit: null, pts_earned: 0, mph_on_contact: 0 },
			};
		}
		bout_metadata[bout][team] = { ...bout_metadata[bout][team], ...data };

		// Always emit boutDataChanged event for any metadata update
		notifyListeners('boutDataChanged', {
			team,
			bout,
			metadata: bout_metadata[bout],
			allMetadata: { ...bout_metadata },
		});

		// Update points immediately when hit data is set
		if (data.pts_earned > 0) {
			points[team] += data.pts_earned;

			// Notify listeners of the point change
			notifyListeners('pointsChanged', {
				team,
				points: points[team],
				addedPoints: data.pts_earned,
				bout,
				hitData: data,
			});

			console.log(getBoutMetadata(current_bout));
		}

		// If both teams have completed the bout, update points again (to handle the -1 for misses)
		if (bout_metadata[bout].red.pts_earned !== 0 && bout_metadata[bout].blue.pts_earned !== 0) {
			// Notify of bout end
			notifyListeners('boutEnd', {
				bout,
				metadata: bout_metadata[bout],
				points: { ...points },
			});
		}
	};

	const getBout = () => current_bout;

	// Returns string with seconds and milliseconds (e.g., "10.28")
	const getElapsedTime = () => {
		if (!game_start_time) return '0.00';
		const milliseconds = Date.now() - game_start_time;
		const seconds = milliseconds / 1000;
		return seconds.toFixed(2);
	};

	const getPoints = (team) => {
		if (team === 'red' || team === 'blue') {
			return points[team];
		}
		return { ...points };
	};

	const getBoutMetadata = (bout) => {
		if (bout) {
			return bout_metadata[bout] || null;
		}
		return { ...bout_metadata };
	};

	const getTotalBouts = () => MAX_BOUTS;

	const isGameComplete = () => current_bout >= MAX_BOUTS;

	const startBout = () => {
		audioManager.stopSound('cheer');

		if (isGameComplete()) {
			notifyListeners('gameEnd', {
				finalPoints: { ...points },
				totalBouts: MAX_BOUTS,
				winner: points.red > points.blue ? 'red' : points.blue > points.red ? 'blue' : 'tie',
			});
			return;
		}

		current_bout++;
		game_started = true;
		bout_countdown_timer = 3;
		can_move = false;
		boutInProgress = true;

		// Reset bout completion tracking
		resetBoutCompletionData();

		// Notify listeners of bout start
		notifyListeners('boutStart', { bout: current_bout });

		countdownInterval = setInterval(() => {
			let soundFile;

			if (bout_countdown_timer === 3) {
				soundFile = 'three';
			} else if (bout_countdown_timer === 2) {
				soundFile = 'two';
			} else if (bout_countdown_timer === 1) {
				soundFile = 'one';
			} else if (bout_countdown_timer === 0) {
				soundFile = 'zero';
			}

			// Notify listeners of countdown change
			notifyListeners('countdown', { timer: bout_countdown_timer, bout: current_bout });

			// Play the correct sound file
			if (soundFile) {
				audioManager.playSound(soundFile, { loop: false, volume: 0.5 });
				bout_countdown_timer -= 1;
			}

			if (bout_countdown_timer <= -1) {
				clearInterval(countdownInterval);
				can_move = true;
				// audioManager.playNeigh(0.4);

				// Start the timer when countdown finishes (only for the first bout)
				if (!game_start_time) {
					game_start_time = Date.now();
				}

				// Notify listeners of state change
				notifyListeners('stateChange', { can_move, bout: current_bout });
			}
		}, 1000);
	};

	// New method to mark player as reached end
	const markPlayerReachedEnd = (isPlayer = true) => {
		if (isPlayer) {
			boutCompletionData.playerReachedEnd = true;
		} else {
			boutCompletionData.opponentReachedEnd = true;
		}
		checkBoutCompletion();
	};

	// New method to update walk distance
	const updateWalkDistance = (isPlayer = true, distance) => {
		if (isPlayer) {
			boutCompletionData.playerWalkedDistance = distance;
		} else {
			boutCompletionData.opponentWalkedDistance = distance;
		}
		checkBoutCompletion();
	};

	// Check if bout is completed
	const checkBoutCompletion = () => {
		if (!boutInProgress) return;

		const playerWalkedEnough =
			boutCompletionData.playerReachedEnd &&
			boutCompletionData.playerWalkedDistance >= boutCompletionData.requiredWalkDistance;

		const opponentWalkedEnough =
			boutCompletionData.opponentReachedEnd &&
			boutCompletionData.opponentWalkedDistance >= boutCompletionData.requiredWalkDistance;

		if (playerWalkedEnough && opponentWalkedEnough) {
			completeBout();
		}
	};

	// Complete the bout and prepare for next one
	const completeBout = () => {
		console.log('Both players completed the bout, starting new bout');
		boutInProgress = false;

		GameState.playScreenTransition(); // play swipe animation

		// Notify that bout is completed and positions need to be reset
		notifyListeners('boutCompleted', {
			bout: current_bout,
			metadata: getBoutMetadata(current_bout),
			nextBout: current_bout + 1,
		});

		// Notify that positions need to be reset (swapped)
		notifyListeners('positionsReset', {
			swap: true,
			nextBout: current_bout + 1,
		});

		// Start next bout after a delay
		setTimeout(() => {
			startBout();
		}, 500);
	};

	const playScreenTransition = () => {
		// Create a full-screen overlay div if it doesn't exist
		let overlay = document.getElementById('screen-transition-overlay');
		if (!overlay) {
			overlay = document.createElement('div');
			overlay.id = 'screen-transition-overlay';

			// Style the overlay
			overlay.style.position = 'fixed';
			overlay.style.top = '0';
			overlay.style.left = '0';
			overlay.style.width = '100%';
			overlay.style.height = '100%';
			overlay.style.backgroundColor = '#f2d5a7';
			overlay.style.zIndex = '1000';
			overlay.style.transformOrigin = 'left';
			overlay.style.transform = 'scaleX(0)';

			document.body.appendChild(overlay);
		}

		// Set initial state
		gsap.set(overlay, {
			scaleX: 0,
			opacity: 1,
			display: 'block',
		});

		// Create timeline for the wipe animation
		const tl = gsap.timeline({
			onComplete: () => {
				// Hide overlay when animation is complete
				gsap.set(overlay, { display: 'none' });
			},
		});

		// Play swipe sound
		audioManager.playSound('woosh', 0.2);

		// Animation sequence
		tl.to(overlay, {
			scaleX: 1,
			duration: 0.4,
			ease: 'power2.in',
		})
			.call(() => {
				// This is where the game state is actually changed
				// The screen is now completely covered, so we can update game elements

				// If swapping sides, this would be a good place to trigger that change
				notifyListeners('transitionMidpoint', {
					bout: current_bout,
					nextBout: current_bout + 1,
				});
			})
			.to(overlay, {
				scaleX: 0,
				transformOrigin: 'right',
				duration: 0.8,
				ease: 'power2.out',
				delay: 0.1,
			});

		return tl; // Return the timeline in case we need to control it elsewhere
	};

	const setKnight = (isPlayer, entity) => {
		if (isPlayer) {
			knights.player = entity;
		} else {
			knights.opponent = entity;
		}
	};

	// Reset bout completion data
	const resetBoutCompletionData = () => {
		boutCompletionData.playerReachedEnd = false;
		boutCompletionData.opponentReachedEnd = false;
		boutCompletionData.playerWalkedDistance = 0;
		boutCompletionData.opponentWalkedDistance = 0;
	};

	const resetGame = () => {
		game_started = false;
		current_bout = 0;
		game_start_time = null;
		can_move = false;
		points.red = 0;
		points.blue = 0;
		bout_countdown_timer = 3;
		boutInProgress = false;

		// Clear metadata
		Object.keys(bout_metadata).forEach((key) => delete bout_metadata[key]);

		// Reset bout completion data
		resetBoutCompletionData();

		if (countdownInterval) {
			clearInterval(countdownInterval);
		}
	};

	// Subscribe to events
	const on = (event, callback) => {
		if (listeners[event]) {
			listeners[event].push(callback);
			return () => {
				listeners[event] = listeners[event].filter((cb) => cb !== callback);
			};
		}
		return () => {}; // No-op for invalid events
	};

	// Notify listeners of events
	const notifyListeners = (event, data) => {
		if (listeners[event]) {
			listeners[event].forEach((callback) => callback(data));
		}
	};

	on('transitionMidpoint', ({ bout }) => {
		const meta = getBoutMetadata(bout);

		if (!meta || meta.red.pts_earned === 0) {
			setBoutMetadata(bout, 'red', {
				part_hit: 'miss',
				pts_earned: -1,
				mph_on_contact: -1,
			});
		}

		if (!meta || meta.blue.pts_earned === 0) {
			setBoutMetadata(bout, 'blue', {
				part_hit: 'miss',
				pts_earned: -1,
				mph_on_contact: -1,
			});
		}
	});

	return {
		get debug() {
			return debug;
		},
		set debug(value) {
			debug = value;
			notifyListeners('stateChange', { debug });
		},

		get use_shaders() {
			return use_shaders;
		},
		set use_shaders(value) {
			use_shaders = value;
			notifyListeners('stateChange', { use_shaders });
		},

		get movementOptions() {
			return movementOptions;
		},

		get game_started() {
			return game_started;
		},
		get bout_countdown_timer() {
			return bout_countdown_timer;
		},
		get can_move() {
			return can_move;
		},
		get boutInProgress() {
			return boutInProgress;
		},

		get playerEntity() {
			return knights.player;
		},

		get opponentEntity() {
			return knights.opponent;
		},

		// Methods
		setKnight,
		getBout,
		getElapsedTime,
		getPoints,
		getBoutMetadata,
		setBoutMetadata,
		getTotalBouts,
		isGameComplete,
		playScreenTransition,
		startBout,
		resetGame,
		on, // Event subscription method

		// New bout management methods
		markPlayerReachedEnd,
		updateWalkDistance,
		checkBoutCompletion,
		completeBout,
		resetBoutCompletionData,
	};
})();

export default GameState;
