// core/AudioManager.js
import * as THREE from 'three';
import gameStateManager from '../GameStateManager';

export class UIManager {
	constructor() {
		this.countdown = gameStateManager.countdown;
	}

	setupGameStateListeners() {
		// gameStateManager.on('winnerRevealed', (data) => {
		// 	console.log('UI MANAGER HI');
		// });
		// gameStateManager.on('countdown', (data) => {
		// 	this.countdown = data.countdown;
		// });
	}

	update(deltaTime) {
		this.setupGameStateListeners();
	}
}
