// game-state instance singleton
const GameState = (() => {
	let debug = true;
	let game_started = false;
	let round_countdown_timer = 3;
	let can_move = false;

	let countdownInterval = null;

	const points = {
		player_points: 0,
		opponent_points: 0,
	};

	const round_metadata = {
		1: {
			player: {
				points_earned: -1,
				mph_on_contact: 0,
			},
			opponent: {
				points_earned: 3,
				mph_on_contact: 0,
			},
		},
	};

	const startRound = () => {
		if (game_started) return;

		game_started = true;
		round_countdown_timer = 3;
		can_move = false;

		countdownInterval = setInterval(() => {
			round_countdown_timer -= 1;
			if (round_countdown_timer <= 0) {
				clearInterval(countdownInterval);
				can_move = true;
			}
		}, 1000);
	};

	return {
		get debug() {
			return debug;
		},
		set debug(value) {
			debug = value;
		},

		get game_started() {
			return game_started;
		},
		get round_countdown_timer() {
			return round_countdown_timer;
		},
		get can_move() {
			return can_move;
		},

		points,
		round_metadata,
		startRound,
	};
})();

export default GameState;
