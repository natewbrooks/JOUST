// game-state.js
const GameState = (() => {
	let debug = true;
	let use_shaders = false;
	let game_started = false;
	let bout_countdown_timer = 3;
	let can_move = false;
	let current_bout = 0;
	let game_start_time = null;

	const MAX_BOUTS = 5;

	let countdownInterval = null;

	// Event listeners - added 'boutDataChanged' for all bout metadata updates
	const listeners = {
		countdown: [],
		boutStart: [],
		boutEnd: [],
		gameEnd: [],
		stateChange: [],
		pointsChanged: [],
		boutDataChanged: [], // New event for any bout data change
	};

	const points = {
		red: 0,
		blue: 0,
	};

	const bout_metadata = {};

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

		// Notify listeners of bout start
		notifyListeners('boutStart', { bout: current_bout });

		countdownInterval = setInterval(() => {
			bout_countdown_timer -= 1;

			// Notify listeners of countdown change
			notifyListeners('countdown', { timer: bout_countdown_timer, bout: current_bout });

			if (bout_countdown_timer <= 0) {
				clearInterval(countdownInterval);
				can_move = true;

				// Start the timer when countdown finishes (only for the first bout)
				if (!game_start_time) {
					game_start_time = Date.now();
				}

				// Notify listeners of state change
				notifyListeners('stateChange', { can_move, bout: current_bout });
			}
		}, 1000);
	};

	const resetGame = () => {
		game_started = false;
		current_bout = 0;
		game_start_time = null;
		can_move = false;
		points.red = 0;
		points.blue = 0;
		bout_countdown_timer = 3;

		// Clear metadata
		Object.keys(bout_metadata).forEach((key) => delete bout_metadata[key]);

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

		get game_started() {
			return game_started;
		},
		get bout_countdown_timer() {
			return bout_countdown_timer;
		},
		get can_move() {
			return can_move;
		},

		// Methods
		getBout,
		getElapsedTime,
		getPoints,
		getBoutMetadata,
		setBoutMetadata,
		getTotalBouts,
		isGameComplete,
		startBout,
		resetGame,
		on, // Event subscription method
	};
})();

export default GameState;
