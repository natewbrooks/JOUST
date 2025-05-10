// core/objects/ShieldEntity.js
import * as THREE from 'three';

export class ShieldEntity {
	constructor(handRef) {
		this.handRef = handRef;

		// Input state
		this.keysPressed = {
			w: false,
			a: false,
			s: false,
			d: false,
		};

		// Movement configuration
		this.maxXMovement = 0.7;
		this.maxZMovement = 0.5;
		this.maxRotation = 1.5; // Maximum rotation in radians

		// Speed configuration
		this.moveSpeed = 0.0002;
		this.rotationSpeed = 0.005;
		this.returnSpeed = 0.03;

		// Store initial position once we have it
		this.initialPosition = null;

		// Animation loop ID
		this.animationFrameId = null;

		// Setup keyboard listeners
		this.setupKeyListeners();

		// Start animation loop
		this.animate();
	}

	setupKeyListeners() {
		const handleKeyDown = (e) => {
			const key = e.key.toLowerCase();
			if (key in this.keysPressed) {
				this.keysPressed[key] = true;
			}
		};

		const handleKeyUp = (e) => {
			const key = e.key.toLowerCase();
			if (key in this.keysPressed) {
				this.keysPressed[key] = false;
			}
		};

		window.addEventListener('keydown', handleKeyDown);
		window.addEventListener('keyup', handleKeyUp);

		// Store remove functions for cleanup
		this.removeKeyListeners = () => {
			window.removeEventListener('keydown', handleKeyDown);
			window.removeEventListener('keyup', handleKeyUp);
		};
	}

	animate() {
		// Store for cancellation on dispose
		this.animationFrameId = requestAnimationFrame(this.animate.bind(this));

		if (!this.handRef) return;

		// Store initial position if we haven't yet
		if (!this.initialPosition && this.handRef.position) {
			this.initialPosition = new THREE.Vector3().copy(this.handRef.position);
		}

		// Skip if we don't have an initial position
		if (!this.initialPosition) return;

		const direction = new THREE.Vector3();
		const velocity = 0.0025;

		// Calculate movement direction based on keys
		if (this.keysPressed.w) direction.x -= this.moveSpeed;
		if (this.keysPressed.s) direction.x += this.moveSpeed;
		if (this.keysPressed.a) direction.z -= this.moveSpeed;
		if (this.keysPressed.d) direction.z += this.moveSpeed;

		// Apply movement with velocity
		direction.normalize().multiplyScalar(velocity);

		// Calculate new potential position
		const newPosition = this.handRef.position.clone().add(direction);

		// Enforce movement boundaries based on the initial position
		this.handRef.position.x = THREE.MathUtils.clamp(
			newPosition.x,
			this.initialPosition.x - this.maxXMovement,
			this.initialPosition.x + this.maxXMovement
		);

		this.handRef.position.z = THREE.MathUtils.clamp(
			newPosition.z,
			this.initialPosition.z - this.maxZMovement,
			this.initialPosition.z + this.maxZMovement
		);

		// Handle rotation when pressing D
		if (this.keysPressed.d) {
			// Accumulate rotation when 'd' is pressed (rotate right/clockwise)
			this.handRef.rotation.z = THREE.MathUtils.clamp(
				this.handRef.rotation.z - this.rotationSpeed,
				-this.maxRotation,
				this.maxRotation
			);
		} else {
			// Smoothly return to center when no A/D is pressed
			this.handRef.rotation.z = THREE.MathUtils.lerp(this.handRef.rotation.z, -1, this.returnSpeed);
		}
	}

	update(deltaTime) {
		// No need for update method as the animation loop handles everything
		// This is just here to match the entity interface
	}

	dispose() {
		// Cancel animation loop
		if (this.animationFrameId) {
			cancelAnimationFrame(this.animationFrameId);
			this.animationFrameId = null;
		}

		// Remove event listeners
		if (this.removeKeyListeners) {
			this.removeKeyListeners();
		}
	}
}
