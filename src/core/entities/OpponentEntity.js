// core/entities/OpponentEntity.js
import { KnightEntity } from './KnightEntity';

export class OpponentEntity extends KnightEntity {
	constructor(scene, position, team, flipped) {
		// Use the opponent's model path
		const modelPath = '/models/knights/Knight2.glb';

		// Call the parent constructor with isPlayer = false
		super(scene, position, team, flipped, modelPath, false);
	}
}
