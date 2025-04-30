import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

export default function Shield({ handRef }) {
	const keysPressedRef = useRef({
		w: false,
		a: false,
		s: false,
		d: false,
	});

	// Configuration for movement and rotation limits
	const [maxXMovement, setMaxXMovement] = useState(0.7);
	const [maxZMovement, setMaxZMovement] = useState(0.5);
	const [maxRotation, setMaxRotation] = useState(1.5); // Maximum rotation in radians

	// Speed configuration
	const moveSpeed = 0.0002;
	const rotationSpeed = 0.005; // Speed of rotation accumulation
	const returnSpeed = 0.03; // How fast it returns to center when no keys pressed

	// Setup key listeners
	useEffect(() => {
		const handleKeyDown = (e) => {
			const key = e.key.toLowerCase();
			if (key in keysPressedRef.current) {
				keysPressedRef.current[key] = true;
			}
		};

		const handleKeyUp = (e) => {
			const key = e.key.toLowerCase();
			if (key in keysPressedRef.current) {
				keysPressedRef.current[key] = false;
			}
		};

		window.addEventListener('keydown', handleKeyDown);
		window.addEventListener('keyup', handleKeyUp);
		return () => {
			window.removeEventListener('keydown', handleKeyDown);
			window.removeEventListener('keyup', handleKeyUp);
		};
	}, []);

	// Animation loop
	useEffect(() => {
		const velocity = 0.0025;

		// Reference position to track bounds
		const initialPosition = new THREE.Vector3();
		if (handRef?.current) {
			initialPosition.copy(handRef.current.position);
		}

		const animate = () => {
			requestAnimationFrame(animate);

			if (!handRef?.current) return;

			const direction = new THREE.Vector3();

			// Movement logic
			if (keysPressedRef.current.w) direction.x -= moveSpeed;
			if (keysPressedRef.current.s) direction.x += moveSpeed;
			if (keysPressedRef.current.a) direction.z -= moveSpeed;
			if (keysPressedRef.current.d) direction.z += moveSpeed;

			// Apply movement with velocity
			direction.normalize().multiplyScalar(velocity);

			// Calculate new potential position
			const newPosition = handRef.current.position.clone().add(direction);

			// Enforce movement boundaries based on the initial position
			handRef.current.position.x = THREE.MathUtils.clamp(
				newPosition.x,
				initialPosition.x - maxXMovement,
				initialPosition.x + maxXMovement
			);

			handRef.current.position.z = THREE.MathUtils.clamp(newPosition.z, maxZMovement, maxZMovement);

			// Rotation logic - accumulative with limits
			// if (keysPressedRef.current.a) {
			// 	// Accumulate rotation when 'a' is pressed (rotate left/counterclockwise)
			// 	handRef.current.rotation.y = THREE.MathUtils.clamp(
			// 		handRef.current.rotation.y + rotationSpeed,
			// 		-maxRotation,
			// 		maxRotation
			// 	);
			// } else

			if (keysPressedRef.current.d) {
				// Accumulate rotation when 'd' is pressed (rotate right/clockwise)
				handRef.current.rotation.z = THREE.MathUtils.clamp(
					handRef.current.rotation.z - rotationSpeed,
					-maxRotation,
					maxRotation
				);
			} else {
				// Smoothly return to center when no A/D is pressed
				handRef.current.rotation.z = THREE.MathUtils.lerp(
					handRef.current.rotation.z,
					-1,
					returnSpeed
				);
			}
		};

		animate();

		// No dependency array cleanup needed since we're using requestAnimationFrame
	}, [handRef, maxXMovement, maxZMovement, maxRotation, moveSpeed]);

	return <></>;
}
