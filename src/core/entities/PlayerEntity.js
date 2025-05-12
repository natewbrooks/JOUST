// core/entities/PlayerEntity.js
import * as THREE from 'three';
import { KnightEntity } from './KnightEntity';
import gameStateManager from '../../GameStateManager';

export class PlayerEntity extends KnightEntity {
	constructor(scene, position, team, flipped, cameraRef, povCameraAnchorRef) {
		// Use the player's model path
		const modelPath = '/models/knights/Knight.glb';

		// Call the parent constructor with isPlayer = true
		super(scene, position, team, flipped, modelPath, true, cameraRef, povCameraAnchorRef);
	}

	// Override update to add player-specific debug logging
	update(deltaTime, newPosition) {
		// Call the parent method first
		super.update(deltaTime, newPosition);

		// Add player-specific debug logging
		if (gameStateManager.debug && Math.random() < 0.01) {
			// Get world position
			const worldPos = new THREE.Vector3();
			this.model?.getWorldPosition(worldPos);
			// console.log('Player world position:', worldPos);
		}
	}
}
